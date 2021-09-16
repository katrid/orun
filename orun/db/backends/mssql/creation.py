import sys

from orun.db.backends.base.creation import BaseDatabaseCreation
from orun.db.backends.utils import strip_quotes


class DatabaseCreation(BaseDatabaseCreation):

    def _quote_name(self, name):
        return self.connection.ops.quote_name(name)

    def _database_exists(self, cursor, database_name):
        cursor.execute('SELECT 1 FROM sysdatabases WHERE name = %s', [strip_quotes(database_name)])
        return cursor.fetchone() is not None

    def _destroy_test_db(self, test_database_name, verbosity):
        """
        Internal implementation - remove the test db tables.
        """
        # Remove the test database to clean up after
        # ourselves. Connect to the previous database (not the test database)
        # to do so, because it's not allowed to delete a database while being
        # connected to it.
        self.connection.cursor().execute('USE master')
        with self.connection._nodb_connection.cursor() as cursor:
            cursor.execute("DROP DATABASE %s" % self.connection.ops.quote_name(test_database_name))
