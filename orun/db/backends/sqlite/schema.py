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
                    cols.append(field.create_column())
                if field.primary_key:
                    constraints.append(sa.PrimaryKeyConstraint(field.db_column, name='pk_' + model._meta.db_table))
                elif field.unique:
                    if model._meta.extension:
                        self.deferred_sql.append(self._create_unique_sql(model, [field.db_column]))
                    else:
                        constraints.append(sa.UniqueConstraint(field.db_column, name=self._create_index_name(model, [field.db_column], prefix='uq_')))

        cols.extend(constraints)
        table = sa.Table(model.Meta.db_table, self.meta_data, *cols)
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
                table.create(bind=self.connection.engine)

        self.deferred_sql.extend(self._model_indexes_sql(model))

        return

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

    def add_field(self, model, field):
        if field.rel:
            field.db_constraint = False
        super().add_field(model, field)


