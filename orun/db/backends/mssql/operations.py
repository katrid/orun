from orun.conf import settings
from orun.db import NotSupportedError
from orun.db.backends.base.operations import BaseDatabaseOperations


class DatabaseOperations(BaseDatabaseOperations):
    compiler_module = "orun.db.backends.mssql.compiler"

    cast_char_field_without_max_length = 'varchar(max)'
    explain_prefix = 'EXPLAIN'
    cast_data_types = {
        'AutoField': 'int',
        'BigAutoField': 'bigint',
    }

    def max_name_length(self):
        return 128

    def quote_name(self, name):
        if name.startswith('"') and name.endswith('"'):
            return name
        return '"%s"' % name

    def fetch_returned_insert_ids(self, cursor):
        """
        Given a cursor object that has just performed an INSERT...OUTPUT
        statement into a table that has an auto-incrementing ID, return the
        list of newly created IDs.
        """
        return [item[0] for item in cursor.fetchall()]

    def return_insert_id(self):
        return "OUTPUT inserted.%s", ()

    def bulk_insert_sql(self, fields, placeholder_rows):
        placeholder_rows_sql = (", ".join(row) for row in placeholder_rows)
        values_sql = ", ".join("(%s)" % sql for sql in placeholder_rows_sql)
        return "VALUES " + values_sql

    def savepoint_create_sql(self, sid):
        """
        Return the SQL for starting a new savepoint. Only required if the
        "uses_savepoints" feature is True. The "sid" parameter is a string
        for the savepoint id.
        """
        return "SAVE TRANSACTION %s" % sid

    def savepoint_commit_sql(self, sid):
        """
        Return the SQL for committing the given savepoint.
        """
        return "COMMIT TRANSACTION %s" % sid

    def savepoint_rollback_sql(self, sid):
        """
        Return the SQL for rolling back the given savepoint.
        """
        return "ROLLBACK TRANSACTION %s" % sid

    def adapt_datetimefield_value(self, value):
        """
        Transform a datetime value to an object compatible with what is expected
        by the backend driver for datetime columns.
        """
        return value
