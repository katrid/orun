import hashlib
import logging
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.schema import CreateColumn, CreateTable

from orun.db import models
from orun.db.backends.utils import truncate_name
from orun.utils import timezone
from orun.utils.encoding import force_bytes

logger = logging.getLogger('orun.db.backends.schema')


def _related_non_m2m_objects(old_field, new_field):
    # Filters out m2m objects from reverse relations.
    # Returns (old_relation, new_relation) tuples.
    return zip(
        (obj for obj in old_field.model._meta.related_objects if not obj.field.many_to_many),
        (obj for obj in new_field.model._meta.related_objects if not obj.field.many_to_many)
    )


class BaseDatabaseSchemaEditor(object):
    """
    This class (and its subclasses) are responsible for emitting schema-changing
    statements to the databases - model creation/removal/alteration, field
    renaming, index fiddling, and so on.

    It is intended to eventually completely replace DatabaseCreation.

    This class should be used by creating an instance for each set of schema
    changes (e.g. a migration file), and by first calling start(),
    then the relevant actions, and then commit(). This is necessary to allow
    things like circular foreign key references - FKs will only be created once
    commit() is called.
    """

    # Overrideable SQL templates
    sql_create_schema = "CREATE SCHEMA %(schema)s"
    sql_create_table = "CREATE TABLE %(table)s (%(definition)s)"
    sql_alter_table = "ALTER TABLE %(table)s %(definition)s"
    sql_alter_table_add_column = "ADD %(column)s"
    sql_rename_table = "ALTER TABLE %(old_table)s RENAME TO %(new_table)s"
    sql_retablespace_table = "ALTER TABLE %(table)s SET TABLESPACE %(new_tablespace)s"
    sql_delete_table = "DROP TABLE %(table)s CASCADE"

    sql_create_column = "ALTER TABLE %(table)s ADD COLUMN %(column)s %(definition)s"
    sql_alter_column = "ALTER TABLE %(table)s %(changes)s"
    sql_alter_column_type = "ALTER COLUMN %(column)s TYPE %(type)s"
    sql_alter_column_null = "ALTER COLUMN %(column)s DROP NOT NULL"
    sql_alter_column_not_null = "ALTER COLUMN %(column)s SET NOT NULL"
    sql_alter_column_default = "ALTER COLUMN %(column)s SET DEFAULT %(default)s"
    sql_alter_column_no_default = "ALTER COLUMN %(column)s DROP DEFAULT"
    sql_delete_column = "ALTER TABLE %(table)s DROP COLUMN %(column)s CASCADE"
    sql_rename_column = "ALTER TABLE %(table)s RENAME COLUMN %(old_column)s TO %(new_column)s"
    sql_update_with_default = "UPDATE %(table)s SET %(column)s = %(default)s WHERE %(column)s IS NULL"

    sql_create_check = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s CHECK (%(check)s)"
    sql_delete_check = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    sql_create_unique = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s UNIQUE (%(columns)s)"
    sql_delete_unique = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    sql_create_fk = (
        "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s FOREIGN KEY (%(column)s) "
        "REFERENCES %(to_table)s (%(to_column)s)%(deferrable)s"
    )
    sql_create_inline_fk = None
    sql_delete_fk = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    sql_create_index = "CREATE INDEX %(name)s ON %(table)s (%(columns)s)%(extra)s"
    sql_delete_index = "DROP INDEX %(name)s"

    sql_create_pk = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s PRIMARY KEY (%(columns)s)"
    sql_delete_pk = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"

    def __init__(self, connection, collect_sql=False, atomic=True):
        self.connection = connection
        self.collect_sql = collect_sql
        if self.collect_sql:
            self.collected_sql = []
        self.atomic_migration = bool(atomic)
        self.meta_data = sa.MetaData(bind=connection)
        self.ddl_compiler = connection.engine.dialect.ddl_compiler(connection.engine.dialect, None)

    # State-managing methods

    def __enter__(self):
        self.deferred_sql = []
        if self.atomic_migration:
            self.atomic = self.connection.engine.session.begin()
            self.atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is None:
            for sql in self.deferred_sql:
                self.execute(sql)
        if self.atomic_migration:
            self.atomic.__exit__(exc_type, exc_value, traceback)

    # Core utility functions

    def execute(self, sql, params=[]):
        """
        Executes the given SQL statement, with optional parameters.
        """
        # Log the command we're running, then run it
        logger.debug("%s; (params %r)", sql, params, extra={'params': params, 'sql': sql})
        if self.collect_sql:
            ending = "" if sql.endswith(";") else ";"
            if params is not None:
                self.collected_sql.append((sql % tuple(map(self.quote_value, params))) + ending)
            else:
                self.collected_sql.append(sql + ending)
        else:
            self.connection.engine.session.execute(sql)
            # with self.connection.raw_connection().cursor() as cursor:
            #     if params:
            #         cursor.execute(sql, params)
            #     else:
            #         cursor.execute(sql)

    def quote_name(self, name):
        if not str(name).startswith('"'):
            return '"%s"' % name
        return str(name)

    @classmethod
    def _digest(cls, *args):
        """
        Generates a 32-bit digest of a set of arguments that can be used to
        shorten identifying names.
        """
        h = hashlib.md5()
        for arg in args:
            h.update(force_bytes(arg))
        return h.hexdigest()[:8]

    # Field <-> database mapping functions

    def column_sql(self, model, field, include_default=False):
        """
        Takes a field and returns its column definition.
        The field must already have had set_attributes_from_name called.
        """
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
        if null:
            sql += " NULL"
        elif not null:
            sql += " NOT NULL"
        # Primary key/unique outputs
        if field.primary_key:
            sql += " PRIMARY KEY"
        elif field.unique:
            sql += " UNIQUE"
        # Optionally add the tablespace if it's an implicitly indexed column
        tablespace = field.db_tablespace or model._meta.db_tablespace
        if tablespace and self.connection.features.supports_tablespaces and field.unique:
            sql += " %s" % self.connection.ops.tablespace_sql(tablespace, inline=True)
        # Return the sql
        return sql, params

    def skip_default(self, field):
        """
        Some backends don't accept default values for certain columns types
        (i.e. MySQL longtext and longblob).
        """
        return False

    def prepare_default(self, value):
        """
        Only used for backends which have requires_literal_defaults feature
        """
        raise NotImplementedError(
            'subclasses of BaseDatabaseSchemaEditor for backends which have '
            'requires_literal_defaults must provide a prepare_default() method'
        )

    def effective_default(self, field):
        """
        Returns a field's effective database default value
        """
        if field.has_default():
            default = field.get_default()
        elif getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
            default = datetime.now()
            internal_type = field.get_internal_type()
            if internal_type == 'DateField':
                default = default.date
            elif internal_type == 'TimeField':
                default = default.time
            elif internal_type == 'DateTimeField':
                default = timezone.now
        else:
            default = None
        # If it's a callable, call it
        if callable(default):
            default = default()
        # Run it through the field's get_db_prep_save method so we can send it
        # to the database.

        #default = field.get_db_prep_save(default, self.connection)

        return default

    def quote_value(self, value):
        """
        Returns a quoted version of the value so it's safe to use in an SQL
        string. This is not safe against injection from user code; it is
        intended only for use in making SQL scripts or preparing default values
        for particularly tricky backends (defaults are not user-defined, though,
        so this is safe).
        """
        raise NotImplementedError()

    # Actions

    def create_schema(self, schema):
        self.execute(self.sql_create_schema % {'schema': self.quote_name(schema)})

    def _create_sa_table(self, model, cols):
        return sa.Table(model._meta.db_table, self.meta_data, *cols, schema=model._meta.db_schema)

    def create_model(self, model):
        """
        Takes a model and creates a table for it in the database.
        Will also create any accompanying indexes or unique constraints.
        """

        cols = []
        constraints = []
        for field in model._meta.local_fields:
            if field.db_column and not field.inherited:
                cols.append(field.create_column(bind=self.connection))
                if isinstance(field, models.ForeignKey) and field.db_constraint:
                    self.deferred_sql.append(self._create_fk_sql(model, field, "_fk_%(to_table)s_%(to_column)s"))
                if field.primary_key:
                    constraints.append(sa.PrimaryKeyConstraint(field.db_column, name='pk_' + model._meta.db_table))
                elif field.unique:
                    if model._meta.extension:
                        self.deferred_sql.append(self._create_unique_sql(model, [field.db_column]))
                    else:
                        constraints.append(sa.UniqueConstraint(field.db_column, name=self._create_index_name(model, [field.db_column], prefix='uq_')))

        cols.extend(constraints)
        table = self._create_sa_table(model, cols)
        if cols:
            if model._meta.extension:
                sql = self.sql_alter_table % {
                    "table": model._meta.table_name,
                    "definition": ", ".join([self.sql_alter_table_add_column % {'column': CreateColumn(col).compile(bind=self.connection)} for col in cols])
                }
                self.connection.session.execute(sql)
            else:
                self.connection.session.execute(str(CreateTable(table).compile(self.connection)))

        self.deferred_sql.extend(self._model_indexes_sql(model))

        return

        # Create column SQL, add FK deferreds if needed
        column_sqls = []
        params = []

        cols = []
        for field in model._meta.local_fields:
            if field.db_column and not field.inherited:
                cols.append(field.create_column())

        table = sa.Table(model._meta.db_table.split('.')[-1], sa.MetaData(self.connection), *cols, schema=model._meta.db_schema)
        for field in model._meta.local_fields:
            if field.db_column is None or field.inherited:
                continue
            # SQL
            definition, extra_params = self.column_sql(model, field)
            if definition is None:
                continue
            # Check constraints can go on the column SQL here
            #CreateColumn(field.column)
            db_params = field.db_parameters(connection=self.connection)
            if db_params['check']:
                definition += " CHECK (%s)" % db_params['check']
            # Autoincrement SQL (for backends with inline variant)
            #col_type_suffix = field.db_type_suffix(connection=self.connection)
            col_type_suffix = None
            if col_type_suffix:
                definition += " %s" % col_type_suffix
            params.extend(extra_params)
            # FK
            if isinstance(field, models.ForeignKey) and field.db_constraint:
                self.deferred_sql.append(self._create_fk_sql(model, field, "_fk_%(to_table)s_%(to_column)s"))
            # Add the SQL to our big list
            column_sqls.append("%s %s" % (
                self.quote_name(field.db_column),
                definition,
            ))
            # Autoincrement SQL (for backends with post table definition variant)
            if field.get_internal_type() in ("AutoField", "BigAutoField"):
                autoinc_sql = self.connection.conn_info.ops.autoinc_sql(model._meta.db_table, field.db_column)
                if autoinc_sql:
                    self.deferred_sql.extend(autoinc_sql)

        # Add any unique_togethers (always deferred, as some fields might be
        # created afterwards, like geometry fields with some backends)
        for fields in model._meta.unique_together:
            columns = [model._meta.get_field(field).db_column for field in fields]
            self.deferred_sql.append(self._create_unique_sql(model, columns))
        # Make or change the table
        if not model._meta.extension:
            pk_name = 'pk_' + model._meta.db_table.split('.')[-1].replace('"', '')
            column_sqls.append(
                """CONSTRAINT %s PRIMARY KEY (%s)""" % (pk_name, model._meta.pk.db_column)
            )
            for field in model._meta.local_fields:
                if field.unique and not field.primary_key and not field.inherited:
                    column_sqls.append(
                        """CONSTRAINT %s UNIQUE (%s)""" % (self._create_index_name(model, [field.db_column], prefix='uq_'), field.db_column)
                    )
            sql = self.sql_create_table % {
                "table": self.quote_name(model._meta.db_table),
                "definition": ", ".join(column_sqls)
            }
        else:
            sql = self.sql_alter_table % {
                "table": self.quote_name(model._meta.db_table),
                "definition": ", ".join([self.sql_alter_table_add_column % {'column': col} for col in column_sqls])
            }
        if model._meta.db_tablespace:
            tablespace_sql = self.connection.conn_info.ops.tablespace_sql(model._meta.db_tablespace)
            if tablespace_sql:
                sql += ' ' + tablespace_sql
        # Prevent using [] as params, in the case a literal '%' is used in the definition
        self.execute(sql, params or None)

        # Add any field index and index_together's (deferred as SQLite3 _remake_table needs it)
        self.deferred_sql.extend(self._model_indexes_sql(model))

        # Make M2M tables
        #for field in model._meta.local_many_to_many:
        #    if field.rel_field.through._meta.auto_created:
        #        self.create_model(field.rel_field.through)

    def delete_model(self, model):
        """
        Deletes a model from the database.
        """
        # Handle auto-created intermediary models
        for field in model._meta.local_fields:
            if field.many_to_many:
                if field.rel_field.through._meta.auto_created:
                    self.delete_model(field.rel_field.through)

        # Delete the table
        self.execute(self.sql_delete_table % {
            "table": model._meta.table_name,
        })

    def add_index(self, index):
        """
        Add an index on a model.
        """
        self.execute(index.create_sql(self))

    def remove_index(self, index):
        """
        Remove an index from a model.
        """
        self.execute(index.remove_sql(self))

    def alter_unique_together(self, model, old_unique_together, new_unique_together):
        """
        Deals with a model changing its unique_together.
        Note: The input unique_togethers must be doubly-nested, not the single-
        nested ["foo", "bar"] format.
        """
        olds = set(tuple(fields) for fields in old_unique_together)
        news = set(tuple(fields) for fields in new_unique_together)
        # Deleted uniques
        for fields in olds.difference(news):
            self._delete_composed_index(model, fields, {'unique': True}, self.sql_delete_unique)
        # Created uniques
        for fields in news.difference(olds):
            columns = [model._meta.get_field(field).db_column for field in fields]
            self.execute(self._create_unique_sql(model, columns))

    def alter_index_together(self, model, old_index_together, new_index_together):
        """
        Deals with a model changing its index_together.
        Note: The input index_togethers must be doubly-nested, not the single-
        nested ["foo", "bar"] format.
        """
        olds = set(tuple(fields) for fields in old_index_together)
        news = set(tuple(fields) for fields in new_index_together)
        # Deleted indexes
        for fields in olds.difference(news):
            self._delete_composed_index(model, fields, {'index': True}, self.sql_delete_index)
        # Created indexes
        for field_names in news.difference(olds):
            fields = [model._meta.fields_dict[field] for field in field_names]
            self.execute(self._create_index_sql(model, fields, prefix="ix_"))

    def _delete_composed_index(self, model, fields, constraint_kwargs, sql):
        columns = [model._meta.get_field(field).column for field in fields]
        constraint_names = self._constraint_names(model, columns, **constraint_kwargs)
        if len(constraint_names) != 1:
            raise ValueError("Found wrong number (%s) of constraints for %s(%s)" % (
                len(constraint_names),
                model._meta.db_table,
                ", ".join(columns),
            ))
        self.execute(self._delete_constraint_sql(sql, model, constraint_names[0]))

    def alter_db_table(self, model, old_db_table, new_db_table):
        """
        Renames the table a model points to.
        """
        if (old_db_table == new_db_table or
            (self.connection.features.ignores_quoted_identifier_case and
                old_db_table.lower() == new_db_table.lower())):
            return
        self.execute(self.sql_rename_table % {
            "old_table": self.quote_name(old_db_table),
            "new_table": self.quote_name(new_db_table),
        })

    def alter_db_tablespace(self, model, old_db_tablespace, new_db_tablespace):
        """
        Moves a model's table between tablespaces
        """
        self.execute(self.sql_retablespace_table % {
            "table": self.quote_name(model._meta.db_table),
            "old_tablespace": self.quote_name(old_db_tablespace),
            "new_tablespace": self.quote_name(new_db_tablespace),
        })

    def add_field(self, model, field):
        """
        Creates a field on a model.
        Usually involves adding a column, but may involve adding a
        table instead (for M2M fields)
        """
        # Special-case implicit M2M tables
        # if field.many_to_many and field.rel_field.through._meta.auto_created:
        #     return self.create_model(field.rel_field.through)
        if field.db_compute:
            sql = self.sql_create_column % {
                "table": model._meta.table_name,
                "column": '',
                "definition": self.ddl_compiler.get_column_specification(field.column)
            }
            params = []
        else:
            if field.many_to_many:
                return
            # Get the column's definition
            definition, params = self.column_sql(model, field)
            # It might not actually have a column behind it
            if definition is None:
                return
            # Check constraints can go on the column SQL here
            # db_params = field.db_parameters(connection=self.connection)
            # if db_params['check']:
            #     definition += " CHECK (%s)" % db_params['check']
            # Build the SQL and run it
            sql = self.sql_create_column % {
                "table": model._meta.table_name,
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

        # Add an index, if required
        if field.db_index and not field.unique:
            self.deferred_sql.append(self._create_index_sql(model, [field]))
        # Add any FK constraints later
        if field.rel and field.db_constraint:
            self.deferred_sql.append(self._create_fk_sql(model, field, "_fk_%(to_table)s_%(to_column)s"))
        # Reset connection if required
        #if self.connection.features.connection_persists_old_columns:
        #    self.connection.close()

    def remove_field(self, model, field):
        """
        Removes a field from a model. Usually involves deleting a column,
        but for M2Ms may involve deleting a table.
        """
        # Special-case implicit M2M tables
        if field.many_to_many and field.rel_field.through._meta.auto_created:
            return self.delete_model(field.rel_field.through)
        # It might not actually have a column behind it
        if field.db_parameters(connection=self.connection)['type'] is None:
            return
        # Drop any FK constraints, MySQL requires explicit deletion
        if field.rel_field:
            fk_names = self._constraint_names(model, [field.db_column], foreign_key=True)
            for fk_name in fk_names:
                self.execute(self._delete_constraint_sql(self.sql_delete_fk, model, fk_name))
        # Delete the column
        sql = self.sql_delete_column % {
            "table": model._meta.table_name,
            "column": self.quote_name(field.db_column),
        }
        self.execute(sql)
        # Reset connection if required
        # if self.connection.features.connection_persists_old_columns:
        #     self.connection.close()

    def alter_column_null(self, column):
        sql = self.sql_alter_column_not_null % {
            'column': column.name, 'definition': column.type.compile(self.connection.engine.dialect),
        }
        sql = self.sql_alter_column % {'table': column.table.fullname, 'changes': sql}
        self.execute(sql)

    def safe_alter_column(self, column, old, indexes=None):
        table_name = column.table.fullname
        # rename the old column
        old_name = f'old__{column.name}'
        s = ''
        i = 0
        print(f'Rename column {column.name} at table {column.table}')
        while old_name + s in old.table.c:
            i += 1
            s = '_' + str(i)
        old_name += s
        new_name = column.name
        db_type = old.type.compile(dialect=self.connection.engine.dialect)
        if db_type.startswith('VARCHAR(-1)'):
            db_type = 'varchar(max)'
        sql = self.sql_create_column % {'table': table_name, 'column': old_name, 'definition': db_type}
        self.execute(sql)
        self.execute(f"UPDATE {table_name} SET {old_name} = {column.compile(dialect=self.connection.engine.dialect)}")

        if indexes is not None:
            for idx in indexes:
                if old.name in idx['column_names']:
                    self.execute(self.sql_delete_index % {'table': table_name, 'name': idx['name']})
        for fk in old.foreign_keys:
            self.execute(self.sql_delete_fk % {'table': table_name, 'name': fk.name})
        sql = self.sql_delete_column % {'table': table_name, 'column': new_name}
        self.execute(sql)

    def compare_fks(self, fk1, fk2):
        return True
        return ','.join(fk._colspec for fk in fk1.foreign_keys) == ','.join(fk._colspec for fk in fk2.foreign_keys)

    def alter_field(self, model, old_field, new_field, strict=False):
        """
        Allows a field's type, uniqueness, nullability, default, column,
        constraints etc. to be modified.
        Requires a copy of the old field as well so we can only perform
        changes that are required.
        If strict is true, raises errors if the old column does not match old_field precisely.
        """
        # Ensure this field is even column-based
        old_db_params = old_field.db_parameters(connection=self.connection)
        old_type = old_db_params['type']
        new_db_params = new_field.db_parameters(connection=self.connection)
        new_type = new_db_params['type']
        if ((old_type is None and old_field.rel_field is None) or
                (new_type is None and new_field.rel_field is None)):
            raise ValueError(
                "Cannot alter field %s into %s - they do not properly define "
                "db_type (are you using a badly-written custom field?)" %
                (old_field, new_field),
            )
        elif old_type is None and new_type is None and (
                old_field.rel_field.through and new_field.rel_field.through and
                old_field.rel_field.through._meta.auto_created and
                new_field.rel_field.through._meta.auto_created):
            return self._alter_many_to_many(model, old_field, new_field, strict)
        elif old_type is None and new_type is None and (
                old_field.rel_field.through and new_field.rel_field.through and
                not old_field.rel_field.through._meta.auto_created and
                not new_field.rel_field.through._meta.auto_created):
            # Both sides have through models; this is a no-op.
            return
        elif old_type is None or new_type is None:
            raise ValueError(
                "Cannot alter field %s into %s - they are not compatible types "
                "(you cannot alter to or from M2M fields, or add or remove "
                "through= on M2M fields)" % (old_field, new_field)
            )

        self._alter_field(model, old_field, new_field, old_type, new_type,
                          old_db_params, new_db_params, strict)

    def _alter_field(self, model, old_field, new_field, old_type, new_type,
                     old_db_params, new_db_params, strict=False):
        """Actually perform a "physical" (non-ManyToMany) field update."""

        # Drop any FK constraints, we'll remake them later
        fks_dropped = set()
        if old_field.rel_field and old_field.db_constraint:
            fk_names = self._constraint_names(model, [old_field.db_column], foreign_key=True)
            if strict and len(fk_names) != 1:
                raise ValueError("Found wrong number (%s) of foreign key constraints for %s.%s" % (
                    len(fk_names),
                    model._meta.db_table,
                    old_field.db_column,
                ))
            for fk_name in fk_names:
                fks_dropped.add((old_field.db_column,))
                self.execute(self._delete_constraint_sql(self.sql_delete_fk, model, fk_name))
        # Has unique been removed?
        if old_field.unique and (not new_field.unique or (not old_field.primary_key and new_field.primary_key)):
            # Find the unique constraint for this field
            constraint_names = self._constraint_names(model, [old_field.db_column], unique=True)
            if strict and len(constraint_names) != 1:
                raise ValueError("Found wrong number (%s) of unique constraints for %s.%s" % (
                    len(constraint_names),
                    model._meta.db_table,
                    old_field.db_column,
                ))
            for constraint_name in constraint_names:
                self.execute(self._delete_constraint_sql(self.sql_delete_unique, model, constraint_name))
        # Drop incoming FK constraints if we're a primary key and things are going
        # to change.
        if old_field.primary_key and new_field.primary_key and old_type != new_type:
            # '_meta.related_field' also contains M2M reverse fields, these
            # will be filtered out
            for _old_rel, new_rel in _related_non_m2m_objects(old_field, new_field):
                rel_fk_names = self._constraint_names(
                    new_rel.related_model, [new_rel.field.db_column], foreign_key=True
                )
                for fk_name in rel_fk_names:
                    self.execute(self._delete_constraint_sql(self.sql_delete_fk, new_rel.related_model, fk_name))
        # Removed an index? (no strict check, as multiple indexes are possible)
        if (old_field.db_index and not new_field.db_index and
                not old_field.unique and not
                (not new_field.unique and old_field.unique)):
            # Find the index for this field
            index_names = self._constraint_names(model, [old_field.db_column], index=True)
            for index_name in index_names:
                self.execute(self._delete_constraint_sql(self.sql_delete_index, model, index_name))
        # Change check constraints?
        if old_db_params['check'] != new_db_params['check'] and old_db_params['check']:
            constraint_names = self._constraint_names(model, [old_field.db_column], check=True)
            if strict and len(constraint_names) != 1:
                raise ValueError("Found wrong number (%s) of check constraints for %s.%s" % (
                    len(constraint_names),
                    model._meta.db_table,
                    old_field.db_column,
                ))
            for constraint_name in constraint_names:
                self.execute(self._delete_constraint_sql(self.sql_delete_check, model, constraint_name))
        # Have they renamed the column?
        if old_field.db_column != new_field.db_column:
            self.execute(self._rename_field_sql(model._meta.table_name, old_field, new_field, new_type))
        # Next, start accumulating actions to do
        actions = []
        null_actions = []
        post_actions = []
        # Type change?
        if old_type != new_type:
            fragment, other_actions = self._alter_column_type_sql(
                model._meta.table_name, old_field, new_field, new_type
            )
            actions.append(fragment)
            post_actions.extend(other_actions)
        # When changing a column NULL constraint to NOT NULL with a given
        # default value, we need to perform 4 steps:
        #  1. Add a default for new incoming writes
        #  2. Update existing NULL rows with new default
        #  3. Replace NULL constraint with NOT NULL
        #  4. Drop the default again.
        # Default change?
        old_default = self.effective_default(old_field)
        new_default = self.effective_default(new_field)
        needs_database_default = (
            old_default != new_default and
            new_default is not None and
            not self.skip_default(new_field)
        )
        if needs_database_default:
            if self.connection.features.requires_literal_defaults:
                # Some databases can't take defaults as a parameter (oracle)
                # If this is the case, the individual schema backend should
                # implement prepare_default
                actions.append((
                    self.sql_alter_column_default % {
                        "column": self.quote_name(new_field.db_column),
                        "type": new_type,
                        "default": self.prepare_default(new_default),
                    },
                    [],
                ))
            else:
                actions.append((
                    self.sql_alter_column_default % {
                        "column": self.quote_name(new_field.db_column),
                        "type": new_type,
                        "default": "%s",
                    },
                    [new_default],
                ))
        # Nullability change?
        if old_field.null != new_field.null:
            if new_field.get_internal_type() in ("CharField", "TextField"):
                # The field is nullable in the database anyway, leave it alone
                pass
            elif new_field.null:
                null_actions.append((
                    self.sql_alter_column_null % {
                        "column": self.quote_name(new_field.db_column),
                        "definition": new_type,
                    },
                    [],
                ))
            else:
                null_actions.append((
                    self.sql_alter_column_not_null % {
                        "column": self.quote_name(new_field.db_column),
                        "type": new_type,
                    },
                    [],
                ))
        # Only if we have a default and there is a change from NULL to NOT NULL
        four_way_default_alteration = (
            new_field.has_default() and
            (old_field.null and not new_field.null)
        )
        if actions or null_actions:
            if not four_way_default_alteration:
                # If we don't have to do a 4-way default alteration we can
                # directly run a (NOT) NULL alteration
                actions = actions + null_actions
            # Combine actions together if we can (e.g. postgres)
            # if self.connection.features.supports_combined_alters and actions:
            #     sql, params = tuple(zip(*actions))
            #     actions = [(", ".join(sql), sum(params, []))]
            # Apply those actions
            for sql, params in actions:
                self.execute(
                    self.sql_alter_column % {
                        "table": model._meta.table_name,
                        "changes": sql,
                    },
                    params,
                )
            if four_way_default_alteration:
                # Update existing rows with default value
                self.execute(
                    self.sql_update_with_default % {
                        "table": model._meta.table_name,
                        "column": self.quote_name(new_field.db_column),
                        "default": "%s",
                    },
                    [new_default],
                )
                # Since we didn't run a NOT NULL change before we need to do it
                # now
                for sql, params in null_actions:
                    self.execute(
                        self.sql_alter_column % {
                            "table": self.quote_name(model._meta.db_table),
                            "changes": sql,
                        },
                        params,
                    )
        if post_actions:
            for sql, params in post_actions:
                self.execute(sql, params)
        # Added a unique?
        if (not old_field.unique and new_field.unique) or (
            old_field.primary_key and not new_field.primary_key and new_field.unique
        ):
            self.execute(self._create_unique_sql(model, [new_field.db_column]))
        # Added an index?
        if (not old_field.db_index and new_field.db_index and
                not new_field.unique and not
                (not old_field.unique and new_field.unique)):
            self.execute(self._create_index_sql(model, [new_field]))
        # Type alteration on primary key? Then we need to alter the column
        # referring to us.
        rels_to_update = []
        if old_field.primary_key and new_field.primary_key and old_type != new_type:
            rels_to_update.extend(_related_non_m2m_objects(old_field, new_field))
        # Changed to become primary key?
        # Note that we don't detect unsetting of a PK, as we assume another field
        # will always come along and replace it.
        if not old_field.primary_key and new_field.primary_key:
            # First, drop the old PK
            constraint_names = self._constraint_names(model, primary_key=True)
            if strict and len(constraint_names) != 1:
                raise ValueError("Found wrong number (%s) of PK constraints for %s" % (
                    len(constraint_names),
                    model._meta.db_table,
                ))
            for constraint_name in constraint_names:
                self.execute(self._delete_constraint_sql(self.sql_delete_pk, model, constraint_name))
            # Make the new one
            self.execute(
                self.sql_create_pk % {
                    "table": model._meta.db_table,
                    "name": self.quote_name(self._create_index_name(model, [new_field.db_column], prefix="pk_")),
                    "columns": self.quote_name(new_field.db_column),
                }
            )
            # Update all referencing columns
            rels_to_update.extend(_related_non_m2m_objects(old_field, new_field))
        # Handle our type alters on the other end of rels from the PK stuff above
        for old_rel, new_rel in rels_to_update:
            rel_db_params = new_rel.field.db_parameters(connection=self.connection)
            rel_type = rel_db_params['type']
            fragment, other_actions = self._alter_column_type_sql(
                new_rel.related_model._meta.db_table, old_rel.field, new_rel.field, rel_type
            )
            self.execute(
                self.sql_alter_column % {
                    "table": self.quote_name(new_rel.related_model._meta.db_table),
                    "changes": fragment[0],
                },
                fragment[1],
            )
            for sql, params in other_actions:
                self.execute(sql, params)
        # Does it have a foreign key?
        if (new_field.rel_field and
                (fks_dropped or not old_field.rel_field or not old_field.db_constraint) and
                new_field.db_constraint):
            self.execute(self._create_fk_sql(model, new_field, "_fk_%(to_table)s_%(to_column)s"))
        # Rebuild FKs that pointed to us if we previously had to drop them
        if old_field.primary_key and new_field.primary_key and old_type != new_type:
            for rel in new_field.model._meta.related_objects:
                if not rel.many_to_many:
                    self.execute(self._create_fk_sql(rel.related_model, rel.field, "_fk"))
        # Does it have check constraints we need to add?
        if old_db_params['check'] != new_db_params['check'] and new_db_params['check']:
            self.execute(
                self.sql_create_check % {
                    "table": self.quote_name(model._meta.db_table),
                    "name": self.quote_name(self._create_index_name(model, [new_field.db_column], suffix="chk_")),
                    "column": self.quote_name(new_field.db_column),
                    "check": new_db_params['check'],
                }
            )
        # Drop the default if we need to
        # (Orun usually does not use in-database defaults)
        if needs_database_default:
            sql = self.sql_alter_column % {
                "table": self.quote_name(model._meta.db_table),
                "changes": self.sql_alter_column_no_default % {
                    "column": self.quote_name(new_field.db_column),
                    "type": new_type,
                }
            }
            self.execute(sql)
        # Reset connection if required
        # if self.connection.features.connection_persists_old_columns:
        #     self.connection.close()

    def _alter_column_type_sql(self, table, old_field, new_field, new_type):
        """
        Hook to specialize column type alteration for different backends,
        for cases when a creation type is different to an alteration type
        (e.g. SERIAL in PostgreSQL, PostGIS fields).

        Should return two things; an SQL fragment of (sql, params) to insert
        into an ALTER TABLE statement, and a list of extra (sql, params) tuples
        to run once the field is altered.
        """
        return (
            (
                self.sql_alter_column_type % {
                    "column": self.quote_name(new_field.db_column),
                    "type": new_type,
                },
                [],
            ),
            [],
        )

    def _alter_many_to_many(self, model, old_field, new_field, strict):
        """
        Alters M2Ms to repoint their to= endpoints.
        """
        # Rename the through table
        if old_field.rel_field.through._meta.db_table != new_field.rel_field.through._meta.db_table:
            self.alter_db_table(old_field.rel_field.through, old_field.rel_field.through._meta.db_table,
                                new_field.rel_field.through._meta.db_table)
        # Repoint the FK to the other side
        self.alter_field(
            new_field.rel_field.through,
            # We need the field that points to the target model, so we can tell alter_field to change it -
            # this is m2m_reverse_field_name() (as opposed to m2m_field_name, which points to our model)
            old_field.rel_field.through._meta.get_field(old_field.m2m_reverse_field_name()),
            new_field.rel_field.through._meta.get_field(new_field.m2m_reverse_field_name()),
        )
        self.alter_field(
            new_field.rel_field.through,
            # for self-referential models we need to alter field from the other end too
            old_field.rel_field.through._meta.get_field(old_field.m2m_field_name()),
            new_field.rel_field.through._meta.get_field(new_field.m2m_field_name()),
        )

    def _create_index_name(self, model, column_names, suffix="", prefix=""):
        """
        Generates a unique name for an index/unique constraint.
        """
        # If there is just one column in the index, use a default algorithm from Orun
        if len(column_names) == 1 and not suffix:
            name = model._meta.table_name
            name = name.replace('"', '')
            if '.' in name:
                name = name.split('.')[1]
            ix_name = column_names[0]
            #ix_name = self._digest(column_names[0])
            if name[-1] == '"':
                name = '%s%s_%s"' % (prefix, name[:-1], ix_name)
            else:
                name = '%s%s_%s' % (prefix, name, ix_name)
            return truncate_name(name, 127)
        # Else generate the name for the index using a different algorithm
        table_name = model._meta.db_table.replace('"', '').replace('.', '_')
        index_unique_name = '_%s' % self._digest(table_name, *column_names)
        max_length = self.connection.conn_info.ops.max_name_length() or 200
        # If the index name is too long, truncate it
        index_name = ('%s%s_%s%s%s' % (
            prefix, table_name, column_names[0], index_unique_name, suffix,
        )).replace('"', '').replace('.', '_')
        if len(index_name) > max_length:
            part = ('_%s%s%s' % (column_names[0], index_unique_name, suffix))
            index_name = '%s%s' % (table_name[:(max_length - len(part))], part)
        # It shouldn't start with an underscore (Oracle hates this)
        if index_name[0] == "_":
            index_name = index_name[1:]
        # If it's STILL too long, just hash it down
        if len(index_name) > max_length:
            index_name = hashlib.md5(force_bytes(index_name)).hexdigest()[:max_length]
        # It can't start with a number on Oracle, so prepend D if we need to
        if index_name[0].isdigit():
            index_name = "D%s" % index_name[:-1]
        return index_name

    def _get_index_tablespace_sql(self, model, fields):
        if len(fields) == 1 and fields[0].db_tablespace:
            tablespace_sql = self.connection.ops.tablespace_sql(fields[0].db_tablespace)
        elif model._meta.db_tablespace:
            tablespace_sql = self.connection.ops.tablespace_sql(model._meta.db_tablespace)
        else:
            tablespace_sql = ""
        if tablespace_sql:
            tablespace_sql = " " + tablespace_sql
        return tablespace_sql

    def _create_index_sql(self, model, fields, suffix="", prefix="", sql=None):
        """
        Return the SQL statement to create the index for one or several fields.
        `sql` can be specified if the syntax differs from the standard (GIS
        indexes, ...).
        """
        tablespace_sql = self._get_index_tablespace_sql(model, fields)
        columns = [field.db_column for field in fields]
        sql_create_index = sql or self.sql_create_index
        name = self.quote_name(self._create_index_name(model, columns, suffix=suffix, prefix=prefix))
        return sql_create_index % {
            "table": model._meta.table_name,
            "name": name,
            "columns": ", ".join(self.quote_name(column) for column in columns),
            "extra": tablespace_sql,
        }

    def _model_indexes_sql(self, model):
        """
        Return all index SQL statements (field indexes, index_together) for the
        specified model, as a list.
        """
        if not model._meta.managed:
            return []
        output = []
        for field in model._meta.local_fields:
            if field.db_column and field.inherited:
                continue
            if self._field_should_be_indexed(model, field):
                output.append(self._create_index_sql(model, [field], prefix="ix_"))

        for field_names in model._meta.index_together:
            fields = [model._meta.get_field(field) for field in field_names]
            output.append(self._create_index_sql(model, fields, prefix="ix_"))
        return output

    def _field_should_be_indexed(self, model, field):
        return field.db_index and not field.unique

    def _rename_field_sql(self, table, old_field, new_field, new_type):
        return self.sql_rename_column % {
            "table": table,
            "old_column": self.quote_name(old_field.db_column),
            "new_column": self.quote_name(new_field.db_column),
            "type": new_type,
        }

    def _create_fk_sql(self, model, field, suffix):
        from_table = model._meta.table_name
        from_column = field.db_column
        to_table = field.rel.model._meta.table_name
        to_column = field.rel.remote_field.db_column
        #to_table = field.target_field.model._meta.db_table
        #to_column = field.target_field.column
        suffix = suffix % {
            "to_table": to_table,
            "to_column": to_column,
        }

        sql = self.sql_create_fk % {
            "table": from_table,
            "name": self.quote_name(self._create_index_name(model, [from_column], prefix='fk_')),
            "column": self.quote_name(from_column),
            "to_table": to_table,
            "to_column": self.quote_name(to_column),
            "deferrable": '', #self.connection.conn_info.ops.deferrable_sql(),
        }

        if field.on_delete is not None:
            sql += ' ON DELETE ' + field.on_delete
        if field.on_update is not None:
            sql += ' ON UPDATE ' + field.on_update
        return sql

    def _create_unique_sql(self, model, columns):
        return self.sql_create_unique % {
            "table": model._meta.table_name,
            "name": self.quote_name(self._create_index_name(model, columns, suffix="_uniq", prefix="ix_")),
            "columns": ", ".join(self.quote_name(column) for column in columns),
        }

    def _delete_constraint_sql(self, template, model, name):
        return template % {
            "table": model._meta.table_name,
            "name": self.quote_name(name),
        }

    def _constraint_names(self, model, column_names=None, unique=None,
                          primary_key=None, index=None, foreign_key=None,
                          check=None):
        """
        Returns all constraint names matching the columns and conditions
        """
        column_names = list(column_names) if column_names else None
        insp = sa.inspect(self.connection)
        fks = insp.dialect.get_foreign_keys(self.connection.session, model._meta.db_table, model._meta.db_schema)
        result = []
        for constraint in fks:
            print(column_names, constraint['constrained_columns'])
            if column_names is None or column_names == constraint['constrained_columns']:
                result.append(constraint['name'])
        return result

    def load_fixtures(self, model, fixtures):
        from orun.core.management.commands.loaddata import load_fixture
        for fixture in fixtures:
            load_fixture(model._meta.app_label, fixture, model=model._meta.name)
