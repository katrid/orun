import logging
import json
from datetime import datetime
from collections import defaultdict
import decimal
from multiprocessing.spawn import old_main_modules

from orun.db.backends.ddl_references import (
    Columns, Expressions, ForeignKeyName, IndexName, Statement, Table,
)
from orun.db.backends.utils import names_digest, split_identifier
from orun.db.models.fields import Field, DecimalField, NOT_PROVIDED, CharField, IntegerField, FloatField, DateField
from orun.db.backends.base.introspection import FieldInfo
from orun.db.models import Model
from orun.db.models.sql import Query
from orun.db.transaction import TransactionManagementError, atomic
from orun.db import metadata
from orun.db.backends.base.base import BaseDatabaseWrapper
from orun.utils import timezone

logger = logging.getLogger('orun.db.backends.schema')


def _is_relevant_relation(relation, altered_field):
    """
    When altering the given field, must constraints on its model from the given
    relation be temporarily dropped?
    """
    field = relation.field
    if field.many_to_many:
        # M2M reverse field
        return False
    if altered_field.primary_key and field.to_fields == [None]:
        # Foreign key constraint on the primary key, which is being altered.
        return True
    # Is the constraint targeting the field being altered?
    return altered_field.name in field.to_fields


def _related_non_m2m_objects(old_field, new_field):
    # Filter out m2m objects from reverse relations.
    # Return (old_relation, new_relation) tuples.
    return zip(
        (obj for obj in old_field.model._meta.related_objects if _is_relevant_relation(obj, old_field)),
        (obj for obj in new_field.model._meta.related_objects if _is_relevant_relation(obj, new_field))
    )


class BaseDatabaseSchemaEditor:
    """
    This class and its subclasses are responsible for emitting schema-changing
    statements to the databases - model creation/removal/alteration, field
    renaming, index fiddling, and so on.
    """
    _create_table_with_constraints = False

    # Overrideable SQL templates
    sql_create_database = """CREATE DATABASE "%(db)s" ENCODING='UTF-8'"""
    sql_create_table = "CREATE TABLE %(table)s (%(definition)s)"
    sql_create_schema = "CREATE SCHEMA %(table)s"
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

    sql_unique_constraint = "UNIQUE (%(columns)s)"
    sql_check_constraint = "CHECK (%(check)s)"
    sql_delete_constraint = "ALTER TABLE %(table)s DROP CONSTRAINT %(name)s"
    sql_constraint = "CONSTRAINT %(name)s %(constraint)s"

    sql_create_check = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s CHECK (%(check)s)"
    sql_delete_check = sql_delete_constraint

    sql_create_unique = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s UNIQUE (%(columns)s)"
    sql_delete_unique = sql_delete_constraint

    sql_create_fk = (
        "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s FOREIGN KEY (%(column)s) "
        "REFERENCES %(to_table)s (%(to_column)s)%(deferrable)s"
    )
    sql_create_inline_fk = None
    sql_delete_fk = sql_delete_constraint

    sql_create_index = "CREATE INDEX IF NOT EXISTS %(name)s ON %(table)s (%(columns)s)%(extra)s%(condition)s"
    sql_create_unique_index = "CREATE UNIQUE INDEX %(name)s ON %(table)s (%(columns)s)%(condition)s"
    sql_delete_index = "DROP INDEX %(name)s"

    sql_create_pk = "ALTER TABLE %(table)s ADD CONSTRAINT %(name)s PRIMARY KEY (%(columns)s)"
    sql_delete_pk = sql_delete_constraint

    sql_delete_procedure = 'DROP PROCEDURE %(procedure)s'
    postponed_sql: list[list | tuple]

    new_metadata: metadata.Metadata = None
    old_metadata: metadata.Metadata = None

    def __init__(self, connection, collect_sql=False, atomic=True):
        self.connection: BaseDatabaseWrapper = connection
        self.collect_sql = collect_sql
        if self.collect_sql:
            self.collected_sql = []
        self.atomic_migration = self.connection.features.can_rollback_ddl and atomic
        self.yes_to_all = False

    # State-managing methods

    def __enter__(self):
        self.deferred_sql = []
        self.postponed_sql = []
        if self.atomic_migration:
            self.atomic = atomic(self.connection.alias)
            self.atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type is None:
            for sql in self.deferred_sql:
                self.execute(sql)
        if self.atomic_migration:
            self.atomic.__exit__(exc_type, exc_value, traceback)
        # postponed sql must be executed in a new transaction
        if self.postponed_sql:
            with atomic(self.connection.alias):
                self.apply_postponed_sql()

    # Core utility functions

    def load_metadata(self):
        # load metadata
        self.new_metadata = metadata.Metadata(self)
        self.new_metadata.load_all()
        with self.connection.cursor() as cursor:
            self.old_metadata = metadata.Metadata(self)
            self.old_metadata.load(self.connection.introspection.get_metadata(cursor))
            self._cached_tables = self.connection.introspection.get_table_list(cursor)

    def execute(self, sql, params=()):
        """Execute the given SQL statement, with optional parameters."""
        # Don't perform the transactional DDL check if SQL is being collected
        # as it's not going to be executed anyway.
        if not self.collect_sql and self.connection.in_atomic_block and not self.connection.features.can_rollback_ddl:
            raise TransactionManagementError(
                "Executing DDL statements while in a transaction on databases "
                "that can't perform a rollback is prohibited."
            )
        # Account for non-string statement objects.
        sql = str(sql)
        # Log the command we're running, then run it
        logger.debug("%s; (params %r)", sql, params, extra={'params': params, 'sql': sql})
        if self.collect_sql:
            ending = "" if sql.endswith(";") else ";"
            if params is not None:
                self.collected_sql.append((sql % tuple(map(self.quote_value, params))) + ending)
            else:
                self.collected_sql.append(sql + ending)
        else:
            with self.connection.cursor() as cursor:
                cursor.execute(sql, params)

    def quote_name(self, name):
        return self.connection.ops.quote_name(name)

    # Field <-> database mapping functions

    def _column_sql_(self, model, field, include_default=True):
        """
        Take a field and return its column definition.
        The field must already have had set_attributes_from_name() called.
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
                sql += " DEFAULT %s" % self.prepare_default(default_value)
        # Oracle treats the empty string ('') as null, so coerce the null
        # option whenever '' is a possible value.
        # if not field.primary_key:
        #     null = True
        if null and not self.connection.features.implied_column_null:
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
        return field.db_default is NOT_PROVIDED

    def prepare_default(self, value):
        """
        Convert a given value into database literal value for default value definition
        """
        # raise NotImplementedError(
        #     'subclasses of BaseDatabaseSchemaEditor for backends which have '
        #     'requires_literal_defaults must provide a prepare_default() method'
        # )
        # quote value if type is string
        if isinstance(value, str):
            return "'%s'" % value
        return str(value)

    @staticmethod
    def _effective_default(field):
        # This method allows testing its logic without a connection.
        if field.db_default is not NOT_PROVIDED:
            return field.db_default
        return
        if field.has_default():
            default = field.get_default()
        elif getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
            default = datetime.now()
            internal_type = field.get_internal_type()
            if internal_type == 'DateField':
                default = default.date()
            elif internal_type == 'TimeField':
                default = default.time()
            elif internal_type == 'DateTimeField':
                default = timezone.now()
        else:
            default = None
        return default

    def effective_default(self, field):
        """Return a field's effective database default value."""
        return self.prepare_default(field.get_db_prep_default(self._effective_default(field), self.connection))

    def quote_value(self, value):
        """
        Return a quoted version of the value so it's safe to use in an SQL
        string. This is not safe against injection from user code; it is
        intended only for use in making SQL scripts or preparing default values
        for particularly tricky backends (defaults are not user-defined, though,
        so this is safe).
        """
        raise NotImplementedError()

    def delete_model(self, model):
        """Delete a model from the database."""
        # Handle auto-created intermediary models
        for field in model._meta.local_many_to_many:
            if field.remote_field.through._meta.auto_created:
                self.delete_model(field.remote_field.through)

        # Delete the table
        self.execute(self.sql_delete_table % {
            "table": self.quote_name(model._meta.db_table),
        })
        # Remove all deferred statements referencing the deleted table.
        for sql in list(self.deferred_sql):
            if isinstance(sql, Statement) and sql.references_table(model._meta.db_table):
                self.deferred_sql.remove(sql)

    def _deferrable_constraint_sql(self, deferrable):
        if deferrable is None:
            return ''
        if deferrable == Deferrable.DEFERRED:
            return ' DEFERRABLE INITIALLY DEFERRED'
        if deferrable == Deferrable.IMMEDIATE:
            return ' DEFERRABLE INITIALLY IMMEDIATE'

    def add_index(self, model, index):
        """Add an index on a model."""
        self.execute(index.create_sql(model, self), params=None)

    def remove_index(self, model, index):
        """Remove an index from a model."""
        self.execute(index.remove_sql(model, self))

    def add_constraint(self, model, constraint):
        """Add a check constraint to a model."""
        sql = constraint.create_sql(model, self)
        if sql:
            self.execute(sql)

    def remove_constraint(self, model, constraint):
        """Remove a check constraint from a model."""
        sql = constraint.remove_sql(model, self)
        if sql:
            self.execute(sql)

    def alter_unique_together(self, model, old_unique_together, new_unique_together):
        """
        Deal with a model changing its unique_together. The input
        unique_togethers must be doubly-nested, not the single-nested
        ["foo", "bar"] format.
        """
        olds = {tuple(fields) for fields in old_unique_together}
        news = {tuple(fields) for fields in new_unique_together}
        # Deleted uniques
        for fields in olds.difference(news):
            self._delete_composed_index(model, fields, {'unique': True}, self.sql_delete_unique)
        # Created uniques
        for fields in news.difference(olds):
            columns = [model._meta.get_field(field).column for field in fields]
            self.execute(self._create_unique_sql(model, columns))

    def _delete_composed_index(self, model, fields, constraint_kwargs, sql):
        meta_constraint_names = {constraint.name for constraint in model._meta.constraints}
        meta_index_names = {constraint.name for constraint in model._meta.indexes}
        columns = [model._meta.get_field(field).column for field in fields]
        constraint_names = self._constraint_names(
            model, columns, exclude=meta_constraint_names | meta_index_names,
            **constraint_kwargs
        )
        if len(constraint_names) != 1:
            raise ValueError("Found wrong number (%s) of constraints for %s(%s)" % (
                len(constraint_names),
                model._meta.db_table,
                ", ".join(columns),
            ))
        self.execute(self._delete_constraint_sql(sql, model, constraint_names[0]))

    def alter_db_table(self, model, old_db_table, new_db_table):
        """Rename the table a model points to."""
        if (old_db_table == new_db_table or
                (self.connection.features.ignores_table_name_case and
                 old_db_table.lower() == new_db_table.lower())):
            return
        self.execute(self.sql_rename_table % {
            "old_table": self.quote_name(old_db_table),
            "new_table": self.quote_name(new_db_table),
        })
        # Rename all references to the old table name.
        for sql in self.deferred_sql:
            if isinstance(sql, Statement):
                sql.rename_table_references(old_db_table, new_db_table)

    def alter_db_tablespace(self, model, old_db_tablespace, new_db_tablespace):
        """Move a model's table between tablespaces."""
        self.execute(self.sql_retablespace_table % {
            "table": self.quote_name(model._meta.db_table),
            "old_tablespace": self.quote_name(old_db_tablespace),
            "new_tablespace": self.quote_name(new_db_tablespace),
        })

    def create_index_name(self, table_name, column_names, suffix=""):
        return self._create_index_name(table_name, column_names, suffix)

    def _create_index_name(self, table_name, column_names, suffix=""):
        """
        Generate a unique name for an index/unique constraint.

        The name is divided into 3 parts: the table name, the column names,
        and a unique digest and suffix.
        """
        _, table_name = split_identifier(table_name)
        hash_suffix_part = '%s%s' % (names_digest(table_name, *column_names, length=8), suffix)
        max_length = self.connection.ops.max_name_length() or 200
        # If everything fits into max_length, use that name.
        index_name = '%s_%s_%s' % (table_name, '_'.join(column_names), hash_suffix_part)
        if len(index_name) <= max_length:
            return index_name
        # Shorten a long suffix.
        if len(hash_suffix_part) > max_length / 3:
            hash_suffix_part = hash_suffix_part[:max_length // 3]
        other_length = (max_length - len(hash_suffix_part)) // 2 - 1
        index_name = '%s_%s_%s' % (
            table_name[:other_length],
            '_'.join(column_names)[:other_length],
            hash_suffix_part,
        )
        # Prepend D if needed to prevent the name from starting with an
        # underscore or a number (not permitted on Oracle).
        if index_name[0] == "_" or index_name[0].isdigit():
            index_name = "D%s" % index_name[:-1]
        return index_name

    def _get_index_tablespace_sql(self, model, fields, db_tablespace=None):
        if db_tablespace is None:
            if len(fields) == 1 and fields[0].db_tablespace:
                db_tablespace = fields[0].db_tablespace
            elif model._meta.db_tablespace:
                db_tablespace = model._meta.db_tablespace
        if db_tablespace is not None:
            return ' ' + self.connection.ops.tablespace_sql(db_tablespace)
        return ''

    def create_database(self, db: str):
        """
        Create a database.
        """
        self.execute(self.sql_create_database % {'db': db})

    def post_create_database(self):
        pass

    def create_schema(self, schema: str):
        """
        Create a database schema.
        """
        if self.connection.features.allows_schema:
            sql = self.sql_create_schema % {
                "table": self.quote_name(schema),
            }
            self.execute(sql, None)

    def table_exists(self, tables: list, model):
        return model._meta.qualname in tables

    def add_column(self, field: Field):
        """
        Create a field on a model. Usually involves adding a column, but may
        involve adding a table instead (for M2M fields).
        """
        model = field.model
        # Store temporary not null state
        old_null = field.null
        field.null = True
        # Special-case implicit M2M tables
        if field.many_to_many and field.remote_field.through._meta.auto_created:
            return self.create_model(field.remote_field.through)
        # Get the column's definition
        definition, params = self.column_sql(model, field, include_default=False)
        # It might not actually have a column behind it
        if definition is None:
            return
        # Check constraints can go on the column SQL here
        db_params = field.db_parameters(connection=self.connection)
        if db_params['check']:
            definition += " " + self.sql_check_constraint % db_params
        # Build the SQL and run it
        sql = self.sql_create_column % {
            "table": self.quote_name(model._meta.db_table),
            "column": self.quote_name(field.column),
            "definition": definition,
        }
        # Restore not null state
        field.null = old_null
        self.execute(sql, params)

        # Add an index, if required
        self.deferred_sql.extend(self._field_indexes_sql(model, field))
        # Add any FK constraints later
        if field.remote_field and self.connection.features.supports_foreign_keys and field.db_constraint:
            self.deferred_sql.append(self._create_fk_sql(model, field, "_fk_%(to_table)s_%(to_column)s"))
        # Reset connection if required
        if self.connection.features.connection_persists_old_columns:
            self.connection.close()

    def compare_default(self, new_default, old_default):
        if old_default is None and new_default is not NOT_PROVIDED:
            return False
        if new_default is True and old_default not in ['true', '1', 1, True, '((1))']:
            return False
        if new_default is False and old_default not in ['false', '0', 0, False, '((0))']:
            return False
        return True

    def add_postponed_sql(self, sql, params=None):
        self.postponed_sql.append((sql, params))

    def apply_postponed_sql(self):
        """
        Apply postponed sql into database
        :return:
        """
        for sql, params in self.postponed_sql:
            if params:
                self.execute(sql, params)
            else:
                self.execute(sql)

    def _apply_default_value_to_null(self, new_field, default):
        self.add_postponed_sql(
            self.sql_update_with_default % {
                'table': new_field.field.model._meta.db_table,
                'column': self.quote_name(new_field.name),
                'default': '%s',
            }, (default,)
        )

    def alter_column_default(self, new_field: metadata.Column):
        #print('Alter column default, not ready')
        return
        if new_field.default is None:
            self.execute(
                self.sql_alter_column % {
                    'table': new_field.model._meta.db_table,
                    'changes': self.sql_alter_column_no_default % {'column': self.quote_name(new_field.name)}
                }
            )
        else:
            self.execute(
                self.sql_alter_column % {
                    'table': new_field.model._meta.db_table,
                    'changes': self.sql_alter_column_default % {
                        'column': self.quote_name(new_field.name),
                        'default': self.prepare_default(new_field.default),
                    }
                }
            )

    def sync_model_ddl(self, model: Model):
        """Synchronize DDL model objects"""
        from orun.db.vsql.triggers import create_agg_triggers
        # sync model triggers
        triggers = defaultdict(list)
        if not self.connection.features.supports_agg_triggers:
            return
        for auto_trigger in model._meta.auto_calc_triggers:
            for k, v in create_agg_triggers(auto_trigger).items():
                triggers[k].append(v)
        for trigger in model._meta.triggers.triggers:
            triggers[trigger.name].append(trigger.get_source())
        if triggers:
            source = f"class Table('{model._meta.name}'):\n"
            for name, sources in triggers.items():
                for i, lines in enumerate(sources):
                    if i > 0:
                        lines = '\n'.join(lines.splitlines()[2:])
                    source += '\n' + lines

            DDL = self.connection.ops.vsql_compiler()(self.connection)
            for stmt in DDL.generate_sql(source):
                self.execute(stmt)

    def save_metadata(self):
        meta = self.new_metadata
        s = json.dumps(meta.dump())
        with self.connection.cursor() as cursor:
            cursor.execute('''UPDATE orun_metadata SET content = %s''', [s])

    def drop_index(self, ix: metadata.Index):
        self.execute(f'''DROP INDEX IF EXISTS {ix.name}''')

    def index_sql(self, table: metadata.Table, ix: metadata.Index):
        table_name = table.tablename
        t = ix.type + ' ' if ix.type else ''
        return f'CREATE {t}INDEX IF NOT EXISTS {ix.name} ON {table_name} ({', '.join(ix.expressions)})'

    def create_index(self, table: metadata.Table, ix: metadata.Index):
        self.execute(self.index_sql(table, ix))

    def fk_sql(self, c: metadata.Constraint):
        table_name = self.connection.ops.get_tablename(c.references[0][0], c.references[0][1])
        sql = f'REFERENCES {table_name} ({', '.join(self.quote_name(rc) for rc in c.references[1])})'
        if c.on_delete:
            sql += f' ON DELETE {c.on_delete}'
        if c.on_update:
            sql += f' ON UPDATE {c.on_update}'
        return sql

    def constraint_sql(self, c: metadata.Constraint):
        sql = f'CONSTRAINT {self.quote_name(c.name)} {c.type} ({', '.join(c.expressions)})'
        if c.type == 'FOREIGN KEY':
            sql += ' ' + self.fk_sql(c)
        if c.deferrable is not None:
            sql += f' DEFERRABLE INITIALLY {c.deferrable}'
        return sql

    def column_type_sql(self, col: metadata.Column) -> str:
        sql = self.connection.data_types[col.type]
        params = col.params
        if params and isinstance(params, list) and params[0]:
            sql += '(' + ', '.join(str(p) for p in params) + ')'
        if col.generated:
            sql += f' GENERATED ALWAYS AS {col.generated} {"VIRTUAL" if not col.stored else "STORED"}'
        else:
            if col.default is not None:
                sql += ' DEFAULT ' + self.prepare_default(col.default)
            if not col.null:
                sql += ' NOT NULL'
            if col.pk:
                sql += ' PRIMARY KEY'
            if col.unique:
                sql += ' UNIQUE'
        return sql

    def column_sql(self, col: metadata.Column) -> str:
        return f'{self.quote_name(col.name)} {self.column_type_sql(col)}'

    def drop_constraint(self, table: metadata.Table, c: metadata.Constraint):
        table_name = table.tablename
        sql = f'ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {self.quote_name(c.name)}'
        self.execute(sql)

    def alter_column_sql(self, col: metadata.Column):
        return self.sql_alter_column

    def _drop_column_backup(self, table: metadata.Table, backup_col: str):
        table_name = table.tablename
        self.execute(self.sql_delete_column % {"table": table_name, "column": self.quote_name(backup_col)})

    def _column_backup(self, table: metadata.Table, col: metadata.Column):
        table_name = table.tablename
        backup_col = f'_{col.name}_bkp'
        try:
            self._drop_column_backup(table, backup_col)
        except:  # noqa
            pass
        old_name = col.name
        try:
            col.name = backup_col
            self.create_column(table, col)
            self.execute(f'UPDATE {table_name} SET {self.quote_name(backup_col)} = {self.quote_name(old_name)}')
        finally:
            col.name = old_name

    def alter_column_type(self, table: metadata.Table, old: metadata.Column, new: metadata.Column):
        table_name = table.tablename
        # backup the old column
        #print('Alter column type, not ready', old.name, old.type, '->', new.type)
        return
        self._column_backup(table, old)
        sql = self.sql_alter_column % {
            "table": table_name,
            "changes": self.sql_alter_column_type % {
                "column": self.quote_name(old.name),
                "type": self.column_type_sql(old),
            }
        }
        self.execute(sql)

    def sync_column(self, table: metadata.Table, old: metadata.Column, new: metadata.Column):
        # alter column type
        if old.type != new.type:
            self.alter_column_type(table, old, new)
        elif old.generated != new.generated or old.stored != new.stored:
            # generated field changed
            self.alter_column_type(table, old, new)
        else:
            # foreign key constraint changed
            if old.fk != new.fk:
                if old.fk:
                    try:
                        self._drop_fk_constraint(old)
                    except:
                        # ignore if fk doesn't exist
                        pass

            if old.params != new.params:
                # resize field
                self.change_field_size(new)

            if old.default != new.default:
                # default value changed
                self.alter_column_default(new)
                # self._apply_default_value_to_null(new, new.field.db_default)

            if old.null != new.null:
                # if new.null:
                #     self._alter_column_null_sql(new)
                print(f'      Column "{new.name}" null changed to {new.null}')

    def change_field_size(self, col: metadata.Column):
        # print('      Change field size', col.name, col.type, col.params)
        return

    def alter_column_null(self, table: metadata.Table, col: metadata.Column):
        sql_change = self.sql_alter_column_null % {'column': self.quote_name(col.name)}
        self.execute(self.sql_alter_column % {'table': table.tablename, 'changes': sql_change})

    def create_column(self, table: metadata.Table, col: metadata.Column):
        table_name = table.tablename
        self.execute(f'ALTER TABLE {table_name} ADD COLUMN {self.column_sql(col)}')

    def create_constraint(self, table: metadata.Table, c: metadata.Constraint):
        # ignore for while
        #sql = f'ALTER TABLE {table.tablename} ADD {self.constraint_sql(c)}'
        #self.execute(sql)
        return

    def table_sql(self, table: metadata.Table) -> str:
        table_name = table.tablename
        cols = ', '.join(self.column_sql(c) for c in table.columns.values())
        if table.constraints and self._create_table_with_constraints:
            cols += ', ' + ', '.join(self.constraint_sql(i) for i in table.constraints.values())
        return f'CREATE TABLE {table_name} ({cols})'

    def create_table(self, table: metadata.Table):
        self.execute(self.table_sql(table))
        # create indexes
        for ix in table.indexes.values():
            self.create_index(table, ix)

    def sync_table(self, old_table: metadata.Table, new_table: metadata.Table):
        changes = self.compare_tables(old_table, new_table)
        for meth, args in changes:
            meth(*args)

    def compare_tables(self, old_table: metadata.Table, new_table: metadata.Table):
        # compare columns
        with self.connection.cursor() as cur:
            # TODO remove in favor of just using cached metadata
            cur.execute(f'select * from {new_table.tablename} where 1=0 limit 0')
            cols = [col[0] for col in cur.description]

        for k, col in new_table.columns.items():
            if k not in old_table.columns:
                # new field
                if k not in cols:
                    yield self.create_column, (new_table, col)
            else:
                old_col = old_table.columns[k]
                if col != old_col:
                    yield self.sync_column, (new_table, old_col, col)
        for k, col in old_table.columns.items():
            if k not in new_table.columns:
                # instead of remove column, let's drop not null
                if not col.null:
                    # drop not null
                    yield self.alter_column_null, (new_table, col,)

        # compare constraints
        for k, c in new_table.constraints.items():
            if k not in old_table.constraints:
                # create new constraint
                yield self.create_constraint, (new_table, c)
        for k, c in old_table.constraints.items():
            if k not in new_table.constraints:
                # drop constraint
                yield self.drop_constraint, (c,)

        # compare indexes
        for k, ix in new_table.indexes.items():
            if k not in old_table.indexes:
                # create new index
                yield self.create_index, (new_table, ix)
        for k, ix in old_table.indexes.items():
            if k not in new_table.indexes:
                # drop removed index
                yield self.drop_index, (ix,)

    def collect_changes(self):
        for k, table in self.new_metadata.tables.items():
            if table.model not in self.old_metadata.tables:
                # new table
                yield self.create_table, (table,)
            else:
                old_table = self.old_metadata.tables[k]
                yield from self.compare_tables(old_table, table)

    def compile_node(self, node) -> str:
        from orun.db import ast
        if isinstance(node, ast.BinOp):
            return f'({self.compile_node(node.left)} {self.compile_node(node.op)} {self.compile_node(node.right)})'
        elif isinstance(node, ast.Expr):
            return f'({self.compile_node(node.value)})'
        elif isinstance(node, ast.Constant):
            return str(node.value)
        elif isinstance(node, ast.Add):
            return '+'
        elif isinstance(node, ast.Sub):
            return '-'
        elif isinstance(node, ast.Mult):
            return '*'
        elif isinstance(node, ast.Div):
            return '/'
        elif isinstance(node, Field):
            return node.column
