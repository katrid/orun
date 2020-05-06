import sys

from orun.db.backends.base.creation import BaseDatabaseCreation
from orun.db.backends.utils import strip_quotes


class DatabaseCreation(BaseDatabaseCreation):

    def _quote_name(self, name):
        return self.connection.ops.quote_name(name)

    def _database_exists(self, cursor, database_name):
        cursor.execute('SELECT 1 FROM sysdatabases WHERE name = %s', [strip_quotes(database_name)])
        return cursor.fetchone() is not None

