import sqlalchemy as sa
from sqlalchemy.schema import CreateColumn

from orun.db import models
from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):
    sql_alter_table_add_column = "ADD COLUMN %(column)s"

    def create_schema(self, schema):
        # ignore create schema statement
        pass

    def create_model(self, model):
        """
        Takes a model and creates a table for it in the database.
        Will also create any accompanying indexes or unique constraints.
        """

        cols = []
        constraints = []
        for field in model._meta.local_fields:
            if field.db_column and not field.inherited:
                if isinstance(field, models.ForeignKey) and field.db_constraint and not isinstance(field, models.OneToOneField):
                    self.deferred_sql.append(self._create_fk_sql(model, field, None))
                    continue
                else:
                    cols.append(field.create_column(bind=self.connection))
                if field.primary_key:
                    constraints.append(sa.PrimaryKeyConstraint(field.db_column, name='pk_' + model._meta.db_table))
                elif field.unique:
                    if model._meta.extension:
                        self.deferred_sql.append(self._create_unique_sql(model, [field.db_column]))
                    else:
                        constraints.append(sa.UniqueConstraint(field.db_column, name=self._create_index_name(model, [field.db_column], prefix='uq_')))

        cols.extend(constraints)
        table = sa.Table(model._meta.table_name, self.meta_data, *cols)
        if cols:
            if model._meta.extension:
                for col in cols:
                    col.nullable = True
                    sql = self.sql_alter_table % {
                        "table": self.quote_name(model._meta.table_name),
                        "definition": self.sql_alter_table_add_column % {'column': CreateColumn(col).compile(bind=self.connection)},
                    }
                    self.connection.execute(sql)
            else:
                table.create(bind=self.connection)

        self.deferred_sql.extend(self._model_indexes_sql(model))

        return

    def column_sql(self, model, field, include_default=False):
        """
        Takes a field and returns its column definition.
        The field must already have had set_attributes_from_name called.
        """
        # Get the column's type and use that as the basis of the SQL
        db_params = field.db_parameters(connection=self.connection)
        sql = db_params['type']
        params = []
        # Check for fields that aren't actually columns (e.g. M2M)
        if sql is None:
            return None, None
        # Work out nullability
        null = field.null
        # If we were told to include a default value, do so
        include_default = include_default and not self.skip_default(field)
        if include_default:
            default_value = self.effective_default(field)
            if default_value is not None:
                if self.connection.features.requires_literal_defaults:
                    # Some databases can't take defaults as a parameter (oracle)
                    # If this is the case, the individual schema backend should
                    # implement prepare_default
                    sql += " DEFAULT %s" % self.prepare_default(default_value)
                else:
                    sql += " DEFAULT %s"
                    params += [default_value]
        if null and not field.primary_key:
            sql += " NULL"
        # Primary key/unique outputs
        if field.primary_key and null:
            sql += " NOT NULL"
        #elif field.unique:
        #    sql += " UNIQUE"
        # Optionally add the tablespace if it's an implicitly indexed column
        tablespace = field.db_tablespace or model._meta.db_tablespace
        if tablespace and self.connection.features.supports_tablespaces and field.unique:
            sql += " %s" % self.connection.conn_info.ops.tablespace_sql(tablespace, inline=True)
        # Return the sql
        return sql, params

    def add_field(self, model, field):
        """
        Creates a field on a model.
        Usually involves adding a column, but may involve adding a
        table instead (for M2M fields)
        """
        # Special-case implicit M2M tables
        if field.many_to_many and field.rel_field.through._meta.auto_created:
            return self.create_model(field.rel_field.through)
        # Get the column's definition
        definition, params = self.column_sql(model, field, include_default=True)
        # It might not actually have a column behind it
        if definition is None:
            return
        # Check constraints can go on the column SQL here
        db_params = field.db_parameters(connection=self.connection)
        if db_params['check']:
            definition += " CHECK (%s)" % db_params['check']
        # Build the SQL and run it
        if not isinstance(field, models.ForeignKey):
            sql = self.sql_create_column % {
                "table": self.quote_name(model._meta.table_name),
                "column": self.quote_name(field.db_column),
                "definition": definition,
            }
            self.execute(sql, params)

        # if not self.skip_default(field) and field.default is not None:
        #     sql = self.sql_alter_column % {
        #         "table": self.quote_name(model._meta.db_table),
        #         "changes": self.sql_alter_column_no_default % {
        #             "column": self.quote_name(field.column),
        #         }
        #     }
        #     self.execute(sql)

        # Add any FK constraints later
        if field.rel_field and field.db_constraint:
            self.deferred_sql.append(self._create_fk_sql(model, field, "_fk_%(to_table)s_%(to_column)s"))
        # Add an index, if required
        if field.db_index and not field.unique:
            self.deferred_sql.append(self._create_index_sql(model, [field]))
        # Reset connection if required
        #if self.connection.features.connection_persists_old_columns:
        #    self.connection.close()

    def _create_fk_sql(self, model, field, suffix):
        to_table = field.rel_field.model._meta.table_name
        to_column = field.rel_field.db_column
        col = field.create_column(bind=self.connection)
        col.nullable = True

        sql = self.sql_alter_table % {
            'table': self.quote_name(model._meta.table_name),
            'definition': self.sql_alter_table_add_column % {'column': CreateColumn(col).compile(bind=self.connection)},
        } + ' REFERENCES %s(%s)' % (self.quote_name(to_table), self.quote_name(to_column))

        return sql
