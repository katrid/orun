import sqlalchemy as sa
import psycopg2

from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):

    sql_alter_column_type = "ALTER COLUMN %(column)s TYPE %(type)s USING %(column)s::%(type)s"

    sql_create_sequence = "CREATE SEQUENCE %(sequence)s"
    sql_delete_sequence = "DROP SEQUENCE IF EXISTS %(sequence)s CASCADE"
    sql_set_sequence_max = "SELECT setval('%(sequence)s', MAX(%(column)s)) FROM %(table)s"

    sql_create_varchar_index = "CREATE INDEX %(name)s ON %(table)s (%(columns)s varchar_pattern_ops)%(extra)s"
    sql_create_text_index = "CREATE INDEX %(name)s ON %(table)s (%(columns)s text_pattern_ops)%(extra)s"

    def quote_value(self, value):
        return psycopg2.extensions.adapt(value)

    def _model_indexes_sql(self, model):
        output = super(DatabaseSchemaEditor, self)._model_indexes_sql(model)
        if not model._meta.managed:
            return output

        for field in model._meta.local_fields:
            if not field.inherited:
                like_index_statement = self._create_like_index_sql(model, field)
                if like_index_statement is not None:
                    output.append(like_index_statement)
        return output

    def _create_like_index_sql(self, model, field):
        """
        Return the statement to create an index with varchar operator pattern
        when the column type is 'varchar' or 'text', otherwise return None.
        """
        db_type = field.db_type()
        if db_type is not None and (field.db_index or field.unique):
            if isinstance(db_type, sa.Text):
                return self._create_index_sql(model, [field], suffix='_like', sql=self.sql_create_text_index)
            elif isinstance(db_type, sa.String):
                return self._create_index_sql(model, [field], suffix='_like', sql=self.sql_create_varchar_index)
        return None

    def _alter_column_type_sql(self, table, old_field, new_field, new_type):
        """
        Makes ALTER TYPE with SERIAL make sense.
        """
        if new_type.lower() in ("serial", "bigserial"):
            column = new_field.column
            sequence_name = "%s_%s_seq" % (table, column)
            col_type = "integer" if new_type.lower() == "serial" else "bigint"
            return (
                (
                    self.sql_alter_column_type % {
                        "column": self.quote_name(column),
                        "type": col_type,
                    },
                    [],
                ),
                [
                    (
                        self.sql_delete_sequence % {
                            "sequence": self.quote_name(sequence_name),
                        },
                        [],
                    ),
                    (
                        self.sql_create_sequence % {
                            "sequence": self.quote_name(sequence_name),
                        },
                        [],
                    ),
                    (
                        self.sql_alter_column % {
                            "table": self.quote_name(table),
                            "changes": self.sql_alter_column_default % {
                                "column": self.quote_name(column),
                                "default": "nextval('%s')" % self.quote_name(sequence_name),
                            }
                        },
                        [],
                    ),
                    (
                        self.sql_set_sequence_max % {
                            "table": self.quote_name(table),
                            "column": self.quote_name(column),
                            "sequence": self.quote_name(sequence_name),
                        },
                        [],
                    ),
                ],
            )
        else:
            return super(DatabaseSchemaEditor, self)._alter_column_type_sql(
                table, old_field, new_field, new_type
            )

    def _alter_field(self, model, old_field, new_field, old_type, new_type,
                     old_db_params, new_db_params, strict=False):
        super(DatabaseSchemaEditor, self)._alter_field(
            model, old_field, new_field, old_type, new_type, old_db_params,
            new_db_params, strict,
        )
        # Added an index? Create any PostgreSQL-specific indexes.
        if not old_field.db_index and not old_field.unique and (new_field.db_index or new_field.unique):
            like_index_statement = self._create_like_index_sql(model, new_field)
            if like_index_statement is not None:
                self.execute(like_index_statement)

        # Removed an index? Drop any PostgreSQL-specific indexes.
        if (old_field.db_index or old_field.unique) and not (new_field.db_index or new_field.unique):
            index_to_remove = self._create_index_name(model, [old_field.column], suffix='_like')
            index_names = self._constraint_names(model, [old_field.column], index=True)
            for index_name in index_names:
                if index_name == index_to_remove:
                    self.execute(self._delete_constraint_sql(self.sql_delete_index, model, index_name))

    def reset_sequence(self, table_name):
        self.connection.engine.session.execute(f'''SELECT pg_catalog.setval(pg_get_serial_sequence('{table_name}', 'id'), MAX(id) + 1) FROM {table_name};''')

