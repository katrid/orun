import pyodbc

from orun.db.backends.base.schema import BaseDatabaseSchemaEditor
from orun.db.backends.ddl_references import IndexColumns


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):

    sql_create_column = "ALTER TABLE %(table)s ADD %(column)s %(definition)s"
    sql_alter_column_type = "ALTER COLUMN %(column)s %(type)s"
    sql_set_sequence_max = "DBCC CHECKIDENT('%(table)s')"

    sql_create_index = "CREATE INDEX %(name)s ON %(table)s%(using)s (%(columns)s)%(extra)s%(condition)s"
    sql_delete_index = "DROP INDEX IF EXISTS %(name)s ON %(table)s"

    # Setting the constraint to IMMEDIATE runs any deferred checks to allow
    # dropping it in the same transaction.
    sql_delete_fk = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    sql_delete_procedure = 'DROP PROCEDURE %(procedure)s(%(param_types)s)'

