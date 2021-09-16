import decimal
from orun.conf import settings
from orun.db import NotSupportedError
from orun.db.backends.base.operations import BaseDatabaseOperations


class DatabaseOperations(BaseDatabaseOperations):
    compiler_module = "orun.db.backends.mssql.compiler"
    dialect_module = "orun.db.backends.mssql.dialect"
    vsql_compiler_module = "orun.db.backends.mssql.vsql"

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
        return value

    def adapt_datefield_value(self, value):
        return value

    def adapt_decimalfield_value(self, value, max_digits=None, decimal_places=None):
        if isinstance(value, decimal.Decimal):
            value = decimal.Context(prec=decimal_places).create_decimal(value)
        return value

    def get_db_converters(self, expression):
        converters = super().get_db_converters(expression)
        internal_type = expression.output_field.get_internal_type()
        if internal_type == 'BinaryField':
            converters.append(self.convert_bynaryfield_value)
        return converters

    def convert_bynaryfield_value(self, value, expression, connection):
        return value

    def sql_flush(self, style, tables, *, reset_sequences=False, allow_cascade=False):
        if not tables:
            return []

        # Perform a single SQL 'TRUNCATE x, y, z...;' statement. It allows us
        # to truncate tables referenced by a foreign key in any other table.
        sql_parts = ['EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";']
        sql_parts.extend([
            style.SQL_KEYWORD('DELETE FROM') + ' ' + style.SQL_FIELD(self.quote_name(table)) + ';' for table in tables
        ])

        sql_parts.append('EXEC sp_msforeachtable "ALTER TABLE ? WITH CHECK CONSTRAINT ALL";')
        if reset_sequences:
            sql_parts.append(style.SQL_KEYWORD('RESTART IDENTITY'))
        return ['%s;' % ' '.join(sql_parts)]

    def conditional_expression_supported_in_where_clause(self, expression):
        """
        Return True, if the conditional expression is supported in the WHERE
        clause.
        """
        return False
