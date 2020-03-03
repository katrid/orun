from orun.db.backends.base.introspection import (
    BaseDatabaseIntrospection, FieldInfo, TableInfo,
)


class DatabaseIntrospection(BaseDatabaseIntrospection):
    ignored_tables = []

