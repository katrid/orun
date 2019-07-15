from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):
    sql_create_column = "ALTER TABLE %(table)s ADD %(column)s %(definition)s"
    sql_alter_column_type = "ALTER COLUMN %(column)s %(type)s"
    sql_alter_table = "ALTER TABLE %(table)s ADD %(definition)s"
    sql_alter_table_add_column = "%(column)s"
    sql_alter_column_null = "ALTER COLUMN %(column)s %(definition)s NOT NULL"
    sql_alter_column_not_null = "ALTER COLUMN %(column)s %(definition)s NULL"
    sql_set_sequence_max = "DBCC CHECKIDENT ('%(table)s')"
    sql_rename_table = "SP_RENAME '%(old_table)s', '%(new_table)s'"
    sql_rename_column = "EXEC SP_RENAME '%(table)s.%(old_column)s', '%(new_column)s', 'COLUMN'"
    sql_delete_column = "ALTER TABLE %(table)s DROP COLUMN %(column)s"
    sql_delete_table = "DROP TABLE %(table)s"
    sql_delete_index = "DROP INDEX %(table)s.%(name)s"

    def _create_fk_sql(self, model, field, suffix):
        sql = super(DatabaseSchemaEditor, self)._create_fk_sql(model, field, suffix)
        return sql

    def compare_fks(self, fk1, fk2):
        res = ','.join(fk.target_fullname if not fk._colspec.startswith('dbo.') else fk._colspec[4:] for fk in fk1) == ','.join(fk.target_fullname for fk in fk2)
        return res

    def reset_sequence(self, table_name):
        self.connection.engine.session.execute(f'''DBCC CHECKIDENT ('%s');  ''' % table_name)


