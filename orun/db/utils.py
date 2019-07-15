from importlib import import_module
from threading import local

from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import DatabaseError

from orun import g
from orun.conf import settings
from orun.core.exceptions import ImproperlyConfigured
from orun.utils.functional import cached_property
from orun.utils.module_loading import import_string

DEFAULT_DB_ALIAS = 'default'


class Error(Exception):
    pass


class InterfaceError(Error):
    pass


class DataError(DatabaseError):
    pass


class OperationalError(DatabaseError):
    pass


class IntegrityError(DatabaseError):
    pass


class InternalError(DatabaseError):
    pass


class ProgrammingError(DatabaseError):
    pass


class NotSupportedError(DatabaseError):
    pass


class ConnectionDoesNotExist(Exception):
    pass


def get_backend(engine):
    backend = 'orun.db.backends.' + engine + '.base.DatabaseWrapper'
    return import_string(backend)


class ConnectionInfo(object):
    def __init__(self, engine):
        self.engine = engine
        self.in_atomic_block = False
        self.savepoints = []
        self.commit_on_exit = True
        self.needs_rollback = False
        self.closed_in_transaction = False

    def schema_editor(self):
        backend = import_module('orun.db.backends.%s.schema' % self.engine.name)
        return backend.DatabaseSchemaEditor(self.engine)

    @cached_property
    def ops(self):
        backend = import_module('orun.db.backends.%s.operations' % self.engine.name)
        return backend.DatabaseOperations(self.engine)


class ConnectionHandler(object):
    def __init__(self, app, databases=None):
        """
        databases is an optional dictionary of database definitions (structured
        like settings.DATABASES).
        """
        self.app = app
        self._databases = databases
        self._connections = local()

    @cached_property
    def databases(self):
        if self._databases is None:
            self._databases = settings.DATABASES
        if self._databases == {}:
            self._databases = {
                DEFAULT_DB_ALIAS: {
                    'ENGINE': 'sqlite:///:memory:',
                },
            }

        if self._databases[DEFAULT_DB_ALIAS] == {}:
            self._databases[DEFAULT_DB_ALIAS]['ENGINE'] = 'sqlite:///:memory:'

        if DEFAULT_DB_ALIAS not in self._databases:
            raise ImproperlyConfigured("You must define a '%s' database" % DEFAULT_DB_ALIAS)
        return self._databases

    def ensure_defaults(self, alias):
        """
        Puts the defaults into the settings dictionary for a given connection
        where no settings is provided.
        """
        try:
            conn = self.databases[alias]
        except KeyError:
            raise ConnectionDoesNotExist("The connection %s doesn't exist" % alias)

        conn.setdefault('ATOMIC_REQUESTS', True)
        conn.setdefault('AUTOCOMMIT', False)
        conn.setdefault('ENGINE', 'sqlite:///')
        if not conn['ENGINE']:
            conn['ENGINE'] = 'sqlite:///'
        conn.setdefault('CONN_MAX_AGE', 0)
        conn.setdefault('OPTIONS', {})
        if conn['ENGINE'] == 'sqlite:///':
            conn['OPTIONS']['connect_args'] = {'check_same_thread': False}
        conn.setdefault('TIME_ZONE', None)

    def prepare_test_settings(self, alias):
        """
        Makes sure the test settings are available in the 'TEST' sub-dictionary.
        """
        try:
            conn = self.databases[alias]
        except KeyError:
            raise ConnectionDoesNotExist("The connection %s doesn't exist" % alias)

        test_settings = conn.setdefault('TEST', {})
        for key in ['CHARSET', 'COLLATION', 'NAME', 'MIRROR']:
            test_settings.setdefault(key, None)

    def __getitem__(self, alias):
        # Get the current database
        from orun.db.models.query import Session
        if hasattr(self._connections, alias):
            return getattr(self._connections, alias)

        self.ensure_defaults(alias)
        self.prepare_test_settings(alias)
        db = self.databases[alias]
        if 'url' not in db:
            db['url'] = make_url(db['ENGINE'])
        url = db['url']
        backend = get_backend(url.drivername.split('+')[0])
        options = db['OPTIONS'] or {}
        conn = backend(url, alias, db, **options)
        conn.session = Session(bind=conn.engine)
        conn.conn_info = ConnectionInfo(conn)
        conn.alias = alias
        setattr(self._connections, alias, conn)
        return conn

    def __setitem__(self, key, value):
        setattr(self._connections, key, value)

    def __delitem__(self, key):
        delattr(self._connections, key)

    def __iter__(self):
        return iter(self.databases)

    def all(self):
        return [self[alias] for alias in self]

    def close_all(self):
        for alias in self:
            try:
                connection = getattr(self._connections, alias)
            except AttributeError:
                continue
            connection.close()
            delattr(self._connections, alias)


class ConnectionRouter:
    def __init__(self, routers=None):
        """
        If routers is not specified, default to settings.DATABASE_ROUTERS.
        """
        self._routers = routers

    @cached_property
    def routers(self):
        if self._routers is None:
            self._routers = settings.DATABASE_ROUTERS
        routers = []
        for r in self._routers:
            if isinstance(r, str):
                router = import_string(r)()
            else:
                router = r
            routers.append(router)
        return routers

    def _router_func(action):
        def _route_db(self, model, **hints):
            chosen_db = None
            for router in self.routers:
                try:
                    method = getattr(router, action)
                except AttributeError:
                    # If the router doesn't have a method, skip to the next one.
                    pass
                else:
                    chosen_db = method(model, **hints)
                    if chosen_db:
                        return chosen_db
            instance = hints.get('instance')
            if instance is not None and instance._state.db:
                return instance._state.db
            return DEFAULT_DB_ALIAS
        return _route_db

    db_for_read = _router_func('db_for_read')
    db_for_write = _router_func('db_for_write')

    def allow_relation(self, obj1, obj2, **hints):
        for router in self.routers:
            try:
                method = router.allow_relation
            except AttributeError:
                # If the router doesn't have a method, skip to the next one.
                pass
            else:
                allow = method(obj1, obj2, **hints)
                if allow is not None:
                    return allow
        return obj1._state.db == obj2._state.db

    def allow_migrate(self, db, app_label, **hints):
        for router in self.routers:
            try:
                method = router.allow_migrate
            except AttributeError:
                # If the router doesn't have a method, skip to the next one.
                continue

            allow = method(db, app_label, **hints)

            if allow is not None:
                return allow
        return True

    def allow_migrate_model(self, db, model):
        return self.allow_migrate(
            db,
            model._meta.app_label,
            model_name=model._meta.model_name,
            model=model,
        )

    def get_migratable_models(self, app_config, db, include_auto_created=False):
        """Return app models allowed to be migrated on provided db."""
        models = app_config.get_models(include_auto_created=include_auto_created)
        return [model for model in models if self.allow_migrate_model(db, model)]
