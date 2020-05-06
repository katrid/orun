from orun.db.backends.base.introspection import (
    BaseDatabaseIntrospection, FieldInfo, TableInfo,
)


class DatabaseIntrospection(BaseDatabaseIntrospection):
    ignored_tables = []

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

