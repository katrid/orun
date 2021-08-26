import ast
import random

from orun.apps import apps
from orun.db import models
from orun.db.backends.base import vsql


class Compiler(vsql.Compiler):
    _trigger_pos = 0

    def begin_if(self, node):
        self.fill("IF ")
        self.traverse(node.test)
        self.fill("BEGIN")

    def end_if(self):
        self.fill("END")

    def begin_elseif(self, node):
        self.fill("END")
        self.fill("ELSE IF ")
        self.traverse(node.test)
        self.fill("BEGIN")

    def end_elseif(self, node):
        self.fill("END")

    def begin_trigger(self, v_trigger: ast.FunctionDef, name: str, event: str):
        self._trigger_vars = {}
        schema = self._model._meta.db_schema or ''
        if schema:
            schema += '.'
        self.fill(f'CREATE OR ALTER TRIGGER {schema}{name} ON {self._model._meta.db_table} {event}\nAS\nBEGIN\n')
        self._trigger_pos = len(self._source)

    def visit_Name(self, node):
        if node.id == 'new':
            self.write('inserted')
        elif node.id == 'old':
            self.write('deleted')
        else:
            super().visit_Name(node)

    def visit_Attribute(self, node: ast.Attribute):
        # add special trigger variables
        if isinstance(node.value, ast.Name) and (node.value.id == 'new' or node.value.id == 'old'):
            var = f'@__{node.value.id}_{node.attr}'
            self._trigger_vars[var] = node
            self.write(var)
        else:
            super().visit_Attribute(node)

    def end_trigger(self, v_trigger: ast.FunctionDef, name: str, event: str):
        _var_types = {
            models.fields.CharField: 'varchar(max)',
            models.fields.IntegerField: 'int',
            models.fields.BigIntegerField: 'bigint',
            models.fields.BigAutoField: 'bigint',
            models.fields.DateField: 'date',
            models.fields.DateTimeField: 'datetime',
            models.fields.TextField: 'text',
            models.fields.FloatField: 'float',
        }

        model = self._model

        def get_var_type(col_name):
            field = model._meta.get_field(col_name)
            if isinstance(field, models.DecimalField):
                return f'decimal({field.max_digits}, {field.decimal_places})'
            if isinstance(field, models.ForeignKey):
                return _var_types[field.remote_field.target_field.__class__]
            return _var_types[field.__class__]

        new_name = f'__trcrnew_{self._create_name()}'
        newnames = [k for k, v in self._trigger_vars.items() if v.value.id == 'new']
        fetch = ''
        decl_cursor = ''
        if newnames:
            cols = [col.attr for col in self._trigger_vars.values() if col.value.id == 'new']
            sel_new = f"SELECT {', '.join(cols)} FROM inserted"
            decl_cursor = f'DECLARE {new_name} CURSOR LOCAL FOR {sel_new}\n'
            decl_cursor += f'OPEN {new_name}\n'

            #declare new variables
            var_types = [f'@__new_{col} {get_var_type(col)}' for col in cols]
            decl_cursor += f"DECLARE {', '.join(var_types)}\n"

            fetch = f"FETCH NEXT FROM {new_name} INTO {','.join(newnames)}\n"

        oldnames = [k for k, v in self._trigger_vars.items() if v.value.id == 'old']
        if oldnames:
            old_name = f'__trcrold_{self._create_name()}'
            cols = [col.attr for col in self._trigger_vars.values() if col.value.id == 'old']
            sel_old = f"SELECT {', '.join(cols)} FROM deleted"
            decl_cursor += f'DECLARE {old_name} CURSOR LOCAL FOR {sel_old}\n'
            decl_cursor += f'OPEN {old_name}\n'

            #declare old variables
            var_types = [f'@__old_{col} {get_var_type(col)}' for col in cols]
            decl_cursor += f"DECLARE {', '.join(var_types)}\n"

            fetch += f"FETCH NEXT FROM {old_name} INTO {','.join(oldnames)}\n"
        decl_cursor += fetch
        decl_cursor += 'WHILE @@FETCH_STATUS = 0\nBEGIN\n'
        self._source.insert(self._trigger_pos, decl_cursor)
        self.fill(fetch)
        self.fill('END')
        self.fill('END;')

    def _create_name(self):
        return random.randint(99999, 9999999999)


class Dialect:
    aliases = {
        'COALESCE': 'ISNULL',
    }
