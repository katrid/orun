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

    def bulk_insert_sql(self, fields, placeholder_rows):
        placeholder_rows_sql = (", ".join(row) for row in placeholder_rows)
        values_sql = ", ".join("(%s)" % sql for sql in placeholder_rows_sql)
        return "VALUES " + values_sql

    def adapt_datetimefield_value(self, value):
        """
        Transform a datetime value to an object compatible with what is expected
        by the backend driver for datetime columns.
        """
        return value
