import pyodbc

from orun.db.backends.base.introspection import (
    BaseDatabaseIntrospection, FieldInfo, TableInfo,
)


class DatabaseIntrospection(BaseDatabaseIntrospection):
    ignored_tables = []
    data_types_reverse = {
        pyodbc.SQL_BIT: 'BooleanField',
        pyodbc.SQL_BINARY: 'BinaryField',
        pyodbc.SQL_VARBINARY: 'BinaryField',
        pyodbc.SQL_BIGINT: 'BigIntegerField',
        pyodbc.SQL_SMALLINT: 'SmallIntegerField',
        pyodbc.SQL_INTEGER: 'IntegerField',
        pyodbc.SQL_LONGVARCHAR: 'TextField',
        pyodbc.SQL_FLOAT: 'FloatField',
        pyodbc.SQL_CHAR: 'CharField',
        pyodbc.SQL_VARCHAR: 'CharField',
        pyodbc.SQL_WCHAR: 'CharField',
        pyodbc.SQL_TYPE_DATE: 'DateField',
        pyodbc.SQL_TYPE_TIME: 'TimeField',
        pyodbc.SQL_TYPE_TIMESTAMP: 'DateTimeField',
        pyodbc.SQL_DECIMAL: 'DecimalField',
        pyodbc.SQL_NUMERIC: 'DecimalField',
        pyodbc.SQL_GUID: 'UUIDField',
    }

    def get_schema_list(self, cursor):
        """Return a list of schemas in the current database."""
        cursor.execute("""select s.name as schema_name from sys.schemas s""")
        return [row[0] for row in cursor.fetchall()]

    def get_table_list(self, cursor):
        cursor.execute("""
        SELECT 
          case table_schema when 'dbo' then table_name else concat(table_schema, '.', table_name) end as table_name,
          't' as type
        FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' 
        """)
        return [TableInfo(*row) for row in cursor.fetchall() if row[0] not in self.ignored_tables]

    def get_table_description(self, cursor, schema_name, table_name):
        """
        Return a description of the table with the DB-API cursor.description
        interface.
        """
        if not schema_name:
            schema_name = 'dbo'
        cursor.columns(table=table_name, schema=schema_name)
        return [
            FieldInfo(
                line[3],
                line[4],
                line[6],
                line[7],
                line[7],
                line[8],
                line[10],
                line[12],
            )
            for line in cursor.fetchall()
        ]


