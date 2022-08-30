from orun.db.models import Field, DecimalField, NOT_PROVIDED
from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):
    sql_alter_column_default = 'ADD CONSTRAINT DF__%(table)s_%(column)s DEFAULT %(default)s FOR "%(column)s"'
    sql_alter_column_no_default = "DROP CONSTRAINT DF_%(table)s_%(column)s"
    sql_create_database = """CREATE DATABASE "%(db)s" """
    sql_create_column = "ALTER TABLE %(table)s ADD %(column)s %(definition)s"
    sql_alter_column_type = "ALTER COLUMN %(column)s %(type)s"
    sql_set_sequence_max = "DBCC CHECKIDENT('%(table)s')"
    sql_alter_column_null = sql_alter_column_type
    sql_rename_column = "EXEC sp_rename '%(table)s.%(old_column)s', %(new_column)s, 'COLUMN'"

    sql_create_index = "CREATE INDEX %(name)s ON %(table)s%(using)s (%(columns)s)%(extra)s%(condition)s"
    sql_delete_index = "DROP INDEX IF EXISTS %(name)s ON %(table)s"

    # Setting the constraint to IMMEDIATE runs any deferred checks to allow
    # dropping it in the same transaction.
    sql_delete_fk = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    sql_delete_procedure = 'DROP PROCEDURE %(procedure)s(%(param_types)s)'

    def change_field_size(self, field: Field):
        if isinstance(field, DecimalField):
            # MS SQL prevents to modify decimal column when it has a default value constraint
            # find the default constraint
            sql = '''SELECT default_constraints.name FROM sys.all_columns 
            INNER JOIN sys.tables ON all_columns.object_id = tables.object_id INNER JOIN sys.schemas
        ON tables.schema_id = schemas.schema_id INNER JOIN sys.default_constraints ON all_columns.default_object_id = default_constraints.object_id 
WHERE schemas.name = %s AND tables.name = %s AND all_columns.name = %s'''
            cur = self.connection.cursor()
            cur.execute(sql, [field.model._meta.db_schema or 'dbo', field.model._meta.tablename, field.column])
            df = cur.fetchone()
            # if it exists
            if df:
                # let's remove default constraint
                df = df[0]
                print('Drop default constraint', df)
                self.execute('''alter table %s drop constraint %s''' % (field.model._meta.db_table, df))
        super().change_field_size(field)
        # recreate default
        if field.db_default is not NOT_PROVIDED:
            sql = self.sql_update_with_default % {
                'table': field.model._meta.db_table,
                'column': field.column,
                'default': field.db_default,
            }
            self.execute(sql)
            # update database with default value
            print('Add default constraint', field, 'value', field.db_default)
            sql = '''alter table %(schema)s.%(table)s add constraint df__%(tablename)s__%(column)s default %(default)s for %(column)s''' % {
                'schema': field.model._meta.db_schema or 'dbo',
                'table': field.model._meta.tablename,
                'tablename': field.model._meta.tablename,
                'column': field.column,
                'default': field.db_default,
            }
            self.execute(sql)

    def prepare_default(self, value):
        """
        Convert a given value into database literal value for default value definition
        """
        # raise NotImplementedError(
        #     'subclasses of BaseDatabaseSchemaEditor for backends which have '
        #     'requires_literal_defaults must provide a prepare_default() method'
        # )
        if value is True:
            return 1
        if value is False:
            return 0
        return str(value)

    def alter_column_default(self, new_field, old_field):
        if new_field.db_default is NOT_PROVIDED:
            self.execute(
                self.sql_alter_column % {
                    'table': new_field.model._meta.db_table,
                    'changes': self.sql_alter_column_no_default % {
                        'table': new_field.model._meta.tablename,
                        'column': old_field.name,
                    }
                }
            )
        else:
            self.execute(
                self.sql_alter_column % {
                    'table': new_field.model._meta.db_table,
                    'changes': self.sql_alter_column_default % {
                        'table': new_field.model._meta.tablename,
                        'column': old_field.name,
                        'default': self.prepare_default(new_field.db_default),
                    }
                }
            )

