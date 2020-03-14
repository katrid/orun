import sys
import pyodbc as Database

from orun.db import utils
from orun.core.exceptions import ImproperlyConfigured
from orun.db.backends.base.base import BaseDatabaseWrapper
from .schema import DatabaseSchemaEditor
from .client import DatabaseClient
from .creation import DatabaseCreation
from .features import DatabaseFeatures
from .introspection import DatabaseIntrospection
from .operations import DatabaseOperations


class DatabaseWrapper(BaseDatabaseWrapper):
    connection: Database.Connection
    vendor = 'mssql'
    display_name = 'MS SQL Server'

    data_types = {
        'AutoField': 'int',
        'BigAutoField': 'bigint',
        'BinaryField': 'binary',
        'BooleanField': 'bit',
        'CharField': 'varchar(%(max_length)s)',
        'DateField': 'date',
        'DateTimeField': 'datetime',
        'DecimalField': 'numeric(%(max_digits)s, %(decimal_places)s)',
        'DurationField': 'bigint',
        'FileField': 'varchar(%(max_length)s)',
        'FilePathField': 'varchar(%(max_length)s)',
        'FloatField': 'float',
        'IntegerField': 'int',
        'BigIntegerField': 'bigint',
        'IPAddressField': 'char(15)',
        'GenericIPAddressField': 'char(39)',
        'OneToOneField': 'bigint',
        'PositiveIntegerField': 'int',
        'PositiveSmallIntegerField': 'smallint',
        'SlugField': 'varchar(%(max_length)s)',
        'SmallIntegerField': 'smallint',
        'TextField': 'text',
        'TimeField': 'time',
        'UUIDField': 'uniqueidentifier',
    }

    data_types_suffix = {
        'AutoField': 'IDENTITY',
        'BigAutoField': 'IDENTITY',
    }

    operators = {
        'exact': '= %s',
        'iexact': '= UPPER(%s)',
        'contains': 'LIKE %s',
        'icontains': 'LIKE UPPER(%s)',
        'regex': 'LIKE %s',
        'iregex': 'LIKE %s',
        'gt': '> %s',
        'gte': '>= %s',
        'lt': '< %s',
        'lte': '<= %s',
        'startswith': 'LIKE %s',
        'endswith': 'LIKE %s',
        'istartswith': 'LIKE UPPER(%s)',
        'iendswith': 'LIKE UPPER(%s)',
    }

    # The patterns below are used to generate SQL pattern lookup clauses when
    # the right-hand side of the lookup isn't a raw string (it might be an expression
    # or the result of a bilateral transformation).
    # In those cases, special characters for LIKE operators (e.g. \, *, _) should be
    # escaped on database side.
    #
    # Note: we use str.format() here for readability as '%' is used as a wildcard for
    # the LIKE operator.
    pattern_esc = r"REPLACE(REPLACE(REPLACE({}, '\', '\\'), '%%', '\%%'), '_', '\_')"
    pattern_ops = {
        'contains': r"LIKE '%%' || {} || '%%' ESCAPE '\'",
        'icontains': r"LIKE '%%' || UPPER({}) || '%%' ESCAPE '\'",
        'startswith': r"LIKE {} || '%%' ESCAPE '\'",
        'istartswith': r"LIKE UPPER({}) || '%%' ESCAPE '\'",
        'endswith': r"LIKE '%%' || {} ESCAPE '\'",
        'iendswith': r"LIKE '%%' || UPPER({}) ESCAPE '\'",
    }

    Database = Database
    SchemaEditorClass = DatabaseSchemaEditor
    # Classes instantiated in __init__().
    client_class = DatabaseClient
    creation_class = DatabaseCreation
    features_class = DatabaseFeatures
    introspection_class = DatabaseIntrospection
    ops_class = DatabaseOperations

    def get_new_connection(self, conn_params):
        connection = Database.connect(**conn_params)

        # self.isolation_level must be set:
        # - after connecting to the database in order to obtain the database's
        #   default when no value is explicitly specified in options.
        # - before calling _set_autocommit() because if autocommit is on, that
        #   will set connection.isolation_level to ISOLATION_LEVEL_AUTOCOMMIT.
        options = self.settings_dict['OPTIONS']
        try:
            self.isolation_level = options['isolation_level']
        except KeyError:
            self.isolation_level = 'READ COMMITED'
        else:
            pass
            # Set the isolation level to the value from OPTIONS.
            # if self.isolation_level != connection.isolation_level:
            #     connection.set_session(isolation_level=self.isolation_level)

        return connection

    def get_connection_params(self):
        settings_dict = self.settings_dict
        if not settings_dict['NAME']:
            raise ImproperlyConfigured(
                "settings.DATABASES is improperly configured. "
                "Please supply the NAME value.")
        kwargs = {
            'database': settings_dict['NAME'],
            'server': settings_dict['HOST'],
            'uid': settings_dict['USER'],
            'pwd': settings_dict['PASSWORD'],
            **settings_dict['OPTIONS'],
        }
        return kwargs

    def _set_autocommit(self, autocommit):
        with self.wrap_database_errors:
            self.connection.autocommit = autocommit

    def init_connection_state(self):
        pass

    def create_cursor(self, name=None):
        return CursorWrapper(self.connection.cursor())

    def is_usable(self):
        try:
            self.connection.cursor().execute("SELECT 1")
        except Database.Error:
            return False
        else:
            return True


class CursorWrapper:
    def __init__(self, cursor: Database.Cursor):
        self.cursor: Database.Cursor = cursor
        self.last_sql = ''
        self.last_params = ()

    def _format_sql(self, sql: str):
        return sql.replace('%s', '?')

    def execute(self, sql: str, params=()):
        self.last_sql = sql
        sql = self._format_sql(sql)
        self.last_params = params
        try:
            self.cursor.execute(sql, params)
        except Database.IntegrityError:
            e = sys.exc_info()[1]
            raise utils.IntegrityError(*e.args)
        except Database.DatabaseError:
            e = sys.exc_info()[1]
            raise utils.DatabaseError(*e.args)

    def executemany(self, sql, params_list):
        sql = self._format_sql(sql)
        try:
            self.cursor.execute(sql, params_list)
        except Database.IntegrityError:
            e = sys.exc_info()[1]
            raise utils.IntegrityError(*e.args)
        except Database.DatabaseError:
            e = sys.exc_info()[1]
            raise utils.DatabaseError(*e.args)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchmany(self, size=None):
        return self.cursor.fetchmany(size)

    @property
    def rowcount(self):
        return self.cursor.rowcount

    def __iter__(self):
        return iter(self.cursor)

    def __enter__(self):
        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False

    def close(self):
        try:
            self.cursor.close()
        except:
            pass
