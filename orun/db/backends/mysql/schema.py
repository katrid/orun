import sqlalchemy as sa
from orun.db.backends.base.schema import BaseDatabaseSchemaEditor
from orun.db.models import NOT_PROVIDED


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):

    sql_rename_table = "RENAME TABLE %(old_table)s TO %(new_table)s"

    sql_alter_column_null = "MODIFY %(column)s %(type)s NULL"
    sql_alter_column_not_null = "MODIFY %(column)s %(type)s NOT NULL"
    sql_alter_column_type = "MODIFY %(column)s %(type)s"
    sql_rename_column = "ALTER TABLE %(table)s CHANGE %(old_column)s %(new_column)s %(type)s"

    sql_delete_unique = "ALTER TABLE %(table)s DROP INDEX %(name)s"

    sql_delete_fk = "ALTER TABLE %(table)s DROP FOREIGN KEY %(name)s"

    sql_delete_index = "DROP INDEX %(name)s ON %(table)s"

    sql_create_pk = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s PRIMARY KEY (%(columns)s)"
    sql_delete_pk = "ALTER TABLE %(table)s DROP PRIMARY KEY"

    def quote_name(self, name):
        if not str(name).startswith('"'):
            return '`%s`' % name
        return str(name)

    def create_schema(self, schema):
        pass

    def _create_sa_table(self, model, cols):
        return sa.Table(model._meta.table_name, self.meta_data, *cols)
