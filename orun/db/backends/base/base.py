import copy
import threading
import time
import warnings
from collections import deque
from contextlib import contextmanager

import _thread
import pytz

from orun.conf import settings
from orun.core.exceptions import ImproperlyConfigured
from orun.db import DEFAULT_DB_ALIAS
from orun.db.backends import utils
from orun.db.backends.base.validation import BaseDatabaseValidation
from orun.db.backends.base.schema import BaseDatabaseSchemaEditor
from orun.db.backends.signals import connection_created
from orun.db.transaction import TransactionManagementError
from orun.db.utils import DatabaseError, DatabaseErrorWrapper
from orun.utils import timezone
from orun.utils.functional import cached_property
import logging

NO_DB_ALIAS = '__no_db__'
logger = logging.getLogger('orun.db.backends')


class BaseDatabaseWrapper:
    """Represent a database connection."""
    # Mapping of Field objects to their column types.
    data_types = {}
    # Mapping of Field objects to their SQL suffix such as AUTOINCREMENT.
    data_types_suffix = {}
    # Mapping of Field objects to their SQL for CHECK constraints.
    data_type_check_constraints = {}
    ops = None
    vendor = 'unknown'
    display_name = 'unknown'
    SchemaEditorClass = None
    # Classes instantiated in __init__().
    client_class = None
    creation_class = None
    features_class = None
    introspection_class = None
    ops_class = None
    validation_class = BaseDatabaseValidation

    queries_limit = 9000

    def __init__(self, settings_dict, alias=DEFAULT_DB_ALIAS):
        # Connection related attributes.
        # The underlying database connection.
        self.connection = None
        # `settings_dict` should be a dictionary containing keys such as
        # NAME, USER, etc. It's called `settings_dict` instead of `settings`
        # to disambiguate it from Orun settings modules.
        self.settings_dict = settings_dict
        self.alias = alias
        # Query logging in debug mode or when explicitly enabled.
        self.queries_log = deque(maxlen=self.queries_limit)
        self.force_debug_cursor = False

        self.accent_insensitive: bool = settings.ACCENT_INSENSITIVE

        # Transaction related attributes.
        # Tracks if the connection is in autocommit mode. Per PEP 249, by
        # default, it isn't.
        self.autocommit = False
        # Tracks if the connection is in a transaction managed by 'atomic'.
        self.in_atomic_block = False
        # Increment to generate unique savepoint ids.
        self.savepoint_state = 0
        # List of savepoints created by 'atomic'.
        self.savepoint_ids = []
        # Tracks if the outermost 'atomic' block should commit on exit,
        # ie. if autocommit was active on entry.
        self.commit_on_exit = True
        # Tracks if the transaction should be rolled back to the next
        # available savepoint because of an exception in an inner block.
        self.needs_rollback = False

        # Connection termination related attributes.
        self.close_at = None
        self.closed_in_transaction = False
        self.errors_occurred = False

        # Thread-safety related attributes.
        self._thread_sharing_lock = threading.Lock()
        self._thread_sharing_count = 0
        self._thread_ident = _thread.get_ident()

        # A list of no-argument functions to run when the transaction commits.
        # Each entry is an (sids, func) tuple, where sids is a set of the
        # active savepoint IDs when this function was registered.
        self.run_on_commit = []

        # Should we run the on-commit hooks the next time set_autocommit(True)
        # is called?
        self.run_commit_hooks_on_set_autocommit_on = False

        # A stack of wrappers to be invoked around execute()/executemany()
        # calls. Each entry is a function taking five arguments: execute, sql,
        # params, many, and context. It's the function's responsibility to
        # call execute(sql, params, many, context).
        self.execute_wrappers = []

        self.client = self.client_class(self)
        self.creation = self.creation_class(self)
        self.features = self.features_class(self)
        self.introspection = self.introspection_class(self)
        self.ops = self.ops_class(self)
        self.validation = self.validation_class(self)

    def ensure_timezone(self):
        """
        Ensure the connection's timezone is set to `self.timezone_name` and
        return whether it changed or not.
        """
        return False

    @cached_property
    def timezone(self):
        """
        Time zone for datetimes stored as naive values in the database.

        Return a tzinfo object or None.

        This is only needed when time zone support is enabled and the database
        doesn't support time zones. (When the database supports time zones,
        the adapter handles aware datetimes so Orun doesn't need to.)
        """
        if not settings.USE_TZ:
            return None
        elif self.features.supports_timezones:
            return None
        elif self.settings_dict['TIME_ZONE'] is None:
            return timezone.utc
        else:
            return pytz.timezone(self.settings_dict['TIME_ZONE'])

    @cached_property
    def timezone_name(self):
        """
        Name of the time zone of the database connection.
        """
        if not settings.USE_TZ:
            return settings.TIME_ZONE
        elif self.settings_dict['TIME_ZONE'] is None:
            return 'UTC'
        else:
            return self.settings_dict['TIME_ZONE']

    @property
    def queries_logged(self):
        return self.force_debug_cursor or settings.DEBUG

    @property
    def queries(self):
        if len(self.queries_log) == self.queries_log.maxlen:
            warnings.warn(
                "Limit for query logging exceeded, only the last {} queries "
                "will be returned.".format(self.queries_log.maxlen))
        return list(self.queries_log)

    # ##### Backend-specific methods for creating connections and cursors #####

    def get_connection_params(self):
        """Return a dict of parameters suitable for get_new_connection."""
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require a get_connection_params() method')

    def get_new_connection(self, conn_params):
        """Open a connection to the database."""
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require a get_new_connection() method')

    def init_connection_state(self):
        """Initialize the database connection settings."""
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require an init_connection_state() method')

    def create_cursor(self, name=None):
        """Create a cursor. Assume that a connection is established."""
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require a create_cursor() method')

    # ##### Backend-specific methods for creating connections #####

    def connect(self):
        """Connect to the database. Assume that the connection is closed."""
        # Check for invalid configurations.
        self.check_settings()
        # In case the previous connection was closed while in an atomic block
        self.in_atomic_block = False
        self.savepoint_ids = []
        self.needs_rollback = False
        # Reset parameters defining when to close the connection
        max_age = self.settings_dict['CONN_MAX_AGE']
        self.close_at = None if max_age is None else time.time() + max_age
        self.closed_in_transaction = False
        self.errors_occurred = False
        # Establish the connection
        conn_params = self.get_connection_params()

        start = time.time()
        try:
            self.connection = self.get_new_connection(conn_params)
        finally:
            stop = time.time()
            duration = stop - start
            logger.debug(
                '(%.3f) %s', duration, 'CONNECT DATABASE',
                extra={'duration': duration, 'sql': 'CONNECT DATABASE'}
            )

        self.set_autocommit(self.settings_dict['AUTOCOMMIT'])
        self.init_connection_state()
        connection_created.send(sender=self.__class__, connection=self)

        self.run_on_commit = []

    def check_settings(self):
        if self.settings_dict['TIME_ZONE'] is not None:
            if not settings.USE_TZ:
                raise ImproperlyConfigured(
                    "Connection '%s' cannot set TIME_ZONE because USE_TZ is "
                    "False." % self.alias)
            elif self.features.supports_timezones:
                raise ImproperlyConfigured(
                    "Connection '%s' cannot set TIME_ZONE because its engine "
                    "handles time zones conversions natively." % self.alias)

    def ensure_connection(self):
        """Guarantee that a connection to the database is established."""
        if self.connection is None:
            with self.wrap_database_errors:
                self.connect()

    # ##### Backend-specific wrappers for PEP-249 connection methods #####

    def _prepare_cursor(self, cursor):
        """
        Validate the connection is usable and perform database cursor wrapping.
        """
        self.validate_thread_sharing()
        if self.queries_logged:
            wrapped_cursor = self.make_debug_cursor(cursor)
        else:
            wrapped_cursor = self.make_cursor(cursor)
        return wrapped_cursor

    def _cursor(self, name=None):
        self.ensure_connection()
        with self.wrap_database_errors:
            return self._prepare_cursor(self.create_cursor(name))

    def _commit(self):
        if self.connection is not None:
            with self.wrap_database_errors:
                return self.connection.commit()

    def _rollback(self):
        if self.connection is not None:
            with self.wrap_database_errors:
                return self.connection.rollback()

    def _close(self):
        if self.connection is not None:
            with self.wrap_database_errors:
                return self.connection.close()

    # ##### Generic wrappers for PEP-249 connection methods #####

    def cursor(self):
        """Create a cursor, opening a connection if necessary."""
        return self._cursor()

    def fetchall_as_dict(self, cursor):
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def commit(self):
        """Commit a transaction and reset the dirty flag."""
        self.validate_thread_sharing()
        self.validate_no_atomic_block()
        self._commit()
        # A successful commit means that the database connection works.
        self.errors_occurred = False
        self.run_commit_hooks_on_set_autocommit_on = True

    def rollback(self):
        """Roll back a transaction and reset the dirty flag."""
        self.validate_thread_sharing()
        self.validate_no_atomic_block()
        self._rollback()
        # A successful rollback means that the database connection works.
        self.errors_occurred = False
        self.needs_rollback = False
        self.run_on_commit = []

    def close(self):
        """Close the connection to the database."""
        self.validate_thread_sharing()
        self.run_on_commit = []

        # Don't call validate_no_atomic_block() to avoid making it difficult
        # to get rid of a connection in an invalid state. The next connect()
        # will reset the transaction state anyway.
        if self.closed_in_transaction or self.connection is None:
            return
        try:
            self._close()
        finally:
            if self.in_atomic_block:
                self.closed_in_transaction = True
                self.needs_rollback = True
            else:
                self.connection = None

    # ##### Backend-specific savepoint management methods #####

    def _savepoint(self, sid):
        with self.cursor() as cursor:
            cursor.execute(self.ops.savepoint_create_sql(sid))

    def _savepoint_rollback(self, sid):
        with self.cursor() as cursor:
            cursor.execute(self.ops.savepoint_rollback_sql(sid))

    def _savepoint_commit(self, sid):
        with self.cursor() as cursor:
            cursor.execute(self.ops.savepoint_commit_sql(sid))

    def _savepoint_allowed(self):
        # Savepoints cannot be created outside a transaction
        return self.features.uses_savepoints and not self.get_autocommit()

    # ##### Generic savepoint management methods #####

    def savepoint(self):
        """
        Create a savepoint inside the current transaction. Return an
        identifier for the savepoint that will be used for the subsequent
        rollback or commit. Do nothing if savepoints are not supported.
        """
        if not self._savepoint_allowed():
            return

        thread_ident = _thread.get_ident()
        tid = str(thread_ident).replace('-', '')

        self.savepoint_state += 1
        sid = "s%s_x%d" % (tid, self.savepoint_state)

        self.validate_thread_sharing()
        self._savepoint(sid)

        return sid

    def savepoint_rollback(self, sid):
        """
        Roll back to a savepoint. Do nothing if savepoints are not supported.
        """
        if not self._savepoint_allowed():
            return

        self.validate_thread_sharing()
        self._savepoint_rollback(sid)

        # Remove any callbacks registered while this savepoint was active.
        self.run_on_commit = [
            (sids, func) for (sids, func) in self.run_on_commit if sid not in sids
        ]

    def savepoint_commit(self, sid):
        """
        Release a savepoint. Do nothing if savepoints are not supported.
        """
        if not self._savepoint_allowed():
            return

        self.validate_thread_sharing()
        self._savepoint_commit(sid)

    def clean_savepoints(self):
        """
        Reset the counter used to generate unique savepoint ids in this thread.
        """
        self.savepoint_state = 0

    # ##### Backend-specific transaction management methods #####

    def _set_autocommit(self, autocommit):
        """
        Backend-specific implementation to enable or disable autocommit.
        """
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require a _set_autocommit() method')

    # ##### Generic transaction management methods #####

    def get_autocommit(self):
        """Get the autocommit state."""
        self.ensure_connection()
        return self.autocommit

    def set_autocommit(self, autocommit, force_begin_transaction_with_broken_autocommit=False):
        """
        Enable or disable autocommit.

        The usual way to start a transaction is to turn autocommit off.
        SQLite does not properly start a transaction when disabling
        autocommit. To avoid this buggy behavior and to actually enter a new
        transaction, an explcit BEGIN is required. Using
        force_begin_transaction_with_broken_autocommit=True will issue an
        explicit BEGIN with SQLite. This option will be ignored for other
        backends.
        """
        self.validate_no_atomic_block()
        self.ensure_connection()

        start_transaction_under_autocommit = (
            force_begin_transaction_with_broken_autocommit and not autocommit and
            hasattr(self, '_start_transaction_under_autocommit')
        )

        if start_transaction_under_autocommit:
            self._start_transaction_under_autocommit()
        else:
            self._set_autocommit(autocommit)

        self.autocommit = autocommit

        if autocommit and self.run_commit_hooks_on_set_autocommit_on:
            self.run_and_clear_commit_hooks()
            self.run_commit_hooks_on_set_autocommit_on = False

    def get_rollback(self):
        """Get the "needs rollback" flag -- for *advanced use* only."""
        if not self.in_atomic_block:
            raise TransactionManagementError(
                "The rollback flag doesn't work outside of an 'atomic' block.")
        return self.needs_rollback

    def set_rollback(self, rollback):
        """
        Set or unset the "needs rollback" flag -- for *advanced use* only.
        """
        if not self.in_atomic_block:
            raise TransactionManagementError(
                "The rollback flag doesn't work outside of an 'atomic' block.")
        self.needs_rollback = rollback

    def validate_no_atomic_block(self):
        """Raise an error if an atomic block is active."""
        if self.in_atomic_block:
            raise TransactionManagementError(
                "This is forbidden when an 'atomic' block is active.")

    def validate_no_broken_transaction(self):
        return

        if self.needs_rollback:
            raise TransactionManagementError(
                "An error occurred in the current transaction. You can't "
                "execute queries until the end of the 'atomic' block.")

    # ##### Foreign key constraints checks handling #####

    @contextmanager
    def constraint_checks_disabled(self):
        """
        Disable foreign key constraint checking.
        """
        disabled = self.disable_constraint_checking()
        try:
            yield
        finally:
            if disabled:
                self.enable_constraint_checking()

    def disable_constraint_checking(self):
        """
        Backends can implement as needed to temporarily disable foreign key
        constraint checking. Should return True if the constraints were
        disabled and will need to be reenabled.
        """
        return False

    def enable_constraint_checking(self):
        """
        Backends can implement as needed to re-enable foreign key constraint
        checking.
        """
        pass

    def check_constraints(self, table_names=None):
        """
        Backends can override this method if they can apply constraint
        checking (e.g. via "SET CONSTRAINTS ALL IMMEDIATE"). Should raise an
        IntegrityError if any invalid foreign key references are encountered.
        """
        pass

    # ##### Connection termination handling #####

    def is_usable(self):
        """
        Test if the database connection is usable.

        This method may assume that self.connection is not None.

        Actual implementations should take care not to raise exceptions
        as that may prevent Orun from recycling unusable connections.
        """
        raise NotImplementedError(
            "subclasses of BaseDatabaseWrapper may require an is_usable() method")

    def close_if_unusable_or_obsolete(self):
        """
        Close the current connection if unrecoverable errors have occurred
        or if it outlived its maximum age.
        """
        if self.connection is not None:
            # If the application didn't restore the original autocommit setting,
            # don't take chances, drop the connection.
            if self.get_autocommit() != self.settings_dict['AUTOCOMMIT']:
                self.close()
                return

            # If an exception other than DataError or IntegrityError occurred
            # since the last commit / rollback, check if the connection works.
            if self.errors_occurred:
                if self.is_usable():
                    self.errors_occurred = False
                else:
                    self.close()
                    return

            if self.close_at is not None and time.time() >= self.close_at:
                self.close()
                return

    # ##### Thread safety handling #####

    @property
    def allow_thread_sharing(self):
        with self._thread_sharing_lock:
            return self._thread_sharing_count > 0

    def inc_thread_sharing(self):
        with self._thread_sharing_lock:
            self._thread_sharing_count += 1

    def dec_thread_sharing(self):
        with self._thread_sharing_lock:
            if self._thread_sharing_count <= 0:
                raise RuntimeError('Cannot decrement the thread sharing count below zero.')
            self._thread_sharing_count -= 1

    def validate_thread_sharing(self):
        """
        Validate that the connection isn't accessed by another thread than the
        one which originally created it, unless the connection was explicitly
        authorized to be shared between threads (via the `inc_thread_sharing()`
        method). Raise an exception if the validation fails.
        """
        if not (self.allow_thread_sharing or self._thread_ident == _thread.get_ident()):
            raise DatabaseError(
                "DatabaseWrapper objects created in a "
                "thread can only be used in that same thread. The object "
                "with alias '%s' was created in thread id %s and this is "
                "thread id %s."
                % (self.alias, self._thread_ident, _thread.get_ident())
            )

    # ##### Miscellaneous #####

    def prepare_database(self):
        """
        Hook to do any database check or preparation, generally called before
        migrating a project or an app.
        """
        pass

    @cached_property
    def wrap_database_errors(self):
        """
        Context manager and decorator that re-throws backend-specific database
        exceptions using Orun's common wrappers.
        """
        return DatabaseErrorWrapper(self)

    def chunked_cursor(self):
        """
        Return a cursor that tries to avoid caching in the database (if
        supported by the database), otherwise return a regular cursor.
        """
        return self.cursor()

    def make_debug_cursor(self, cursor):
        """Create a cursor that logs all queries in self.queries_log."""
        return utils.CursorDebugWrapper(cursor, self)

    def make_cursor(self, cursor):
        """Create a cursor without debug logging."""
        return utils.CursorWrapper(cursor, self)

    @contextmanager
    def temporary_connection(self):
        """
        Context manager that ensures that a connection is established, and
        if it opened one, closes it to avoid leaving a dangling connection.
        This is useful for operations outside of the request-response cycle.

        Provide a cursor: with self.temporary_connection() as cursor: ...
        """
        must_close = self.connection is None
        try:
            with self.cursor() as cursor:
                yield cursor
        finally:
            if must_close:
                self.close()

    @property
    def _nodb_connection(self):
        """
        Return an alternative connection to be used when there is no need to
        access the main database, specifically for test db creation/deletion.
        This also prevents the production database from being exposed to
        potential child threads while (or after) the test database is destroyed.
        Refs #10868, #17786, #16969.
        """
        return self.__class__({**self.settings_dict, 'NAME': None}, alias=NO_DB_ALIAS)

    def schema_editor(self, *args, **kwargs) -> BaseDatabaseSchemaEditor:
        """
        Return a new instance of this backend's SchemaEditor.
        """
        if self.SchemaEditorClass is None:
            raise NotImplementedError(
                'The SchemaEditorClass attribute of this database wrapper is still None')
        return self.SchemaEditorClass(self, *args, **kwargs)

    def on_commit(self, func):
        if self.in_atomic_block:
            # Transaction in progress; save for execution on commit.
            self.run_on_commit.append((set(self.savepoint_ids), func))
        elif not self.get_autocommit():
            raise TransactionManagementError('on_commit() cannot be used in manual transaction management')
        else:
            # No transaction in progress and in autocommit mode; execute
            # immediately.
            func()

    def run_and_clear_commit_hooks(self):
        self.validate_no_atomic_block()
        current_run_on_commit = self.run_on_commit
        self.run_on_commit = []
        while current_run_on_commit:
            sids, func = current_run_on_commit.pop(0)
            func()

    @contextmanager
    def execute_wrapper(self, wrapper):
        """
        Return a context manager under which the wrapper is applied to suitable
        database query executions.
        """
        self.execute_wrappers.append(wrapper)
        try:
            yield
        finally:
            self.execute_wrappers.pop()

    def copy(self, alias=None):
        """
        Return a copy of this connection.

        For tests that require two connections to the same database.
        """
        settings_dict = copy.deepcopy(self.settings_dict)
        if alias is None:
            alias = self.alias
        return type(self)(settings_dict, alias)

    def call(self, proc_name: str, args=None):
        raise NotImplementedError()

    def execute(self, sql: str, params=None):
        from orun.db._sql import ExecuteSQL
        return ExecuteSQL(self, sql).using(params).execute()
