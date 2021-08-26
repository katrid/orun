from contextlib import contextmanager
import ast

from orun.apps import apps


COMMON_TRIGGER_NAMES = (
    'before_insert', 'before_update', 'before_delete', 'after_insert', 'after_update', 'after_delete'
)

TRIGGER_SUFFIX = {
    'before_insert': 'bi',
    'before_update': 'bu',
    'before_delete': 'bd',
    'after_insert': 'ai',
    'after_update': 'au',
    'after_delete': 'ad'
}


class Compiler(ast._Unparser):
    """
    Virtual SQL Compiler
    """
    def __init__(self, ops):
        super().__init__()
        self.ops = ops
        self.dialect = ops.dialect()
        self._cur_model = None
        self._name = None
        self._trigger_vars = None
        self.pending_operations = []

    @contextmanager
    def block(self, *, extra = None):
        """A context manager for preparing the source for blocks. It adds
        the character':', increases the indentation on enter and decreases
        the indentation on exit. If *extra* is given, it will be directly
        appended after the colon character.
        """
        if extra:
            self.write(extra)
        self._indent += 1
        yield
        self._indent -= 1

    def end_sql(self):
        self.pending_operations.append(''.join(self._source))
        self._source = []

    def visit_Import(self, node):
        pass

    def visit_ImportFrom(self, node):
        pass

    def _write_docstring(self, node):
        self.fill()
        self.write(f'/* {node.value} */')
        self.fill()

    def _write_docstring_and_traverse_body(self, node):
        if (docstring := self.get_raw_docstring(node)):
            self._write_docstring(docstring)
            self.traverse(node.body[1:])
        else:
            self.traverse(node.body)

    def _render_set(self, set):
        for i, kw in enumerate(set.keywords):
            if i > 0:
                self.write(',')
            self.write(f'{kw.arg}=(')
            self.traverse(kw.value)
            self.write(')')

    def visit_update(self, set, where):
        fn = set.func
        if isinstance(fn.value, ast.Call) and isinstance(fn.value.func, ast.Name) and fn.value.func.id == 'Update':
            self.fill(f'UPDATE ')
            self.write(apps[fn.value.args[0].value]._meta.db_table)
            self.fill(f'SET ')
            self._render_set(set)
            if where:
                self.fill('WHERE ')
                self._render_where(where)
            self.write(';')

    def visit_Call(self, node):
        # Check if where clause
        if node.func.attr == 'where':
            self.visit_where(node)
        else:
            super().visit_Call(node)

    def visit_If(self, node):
        self.begin_if(node)
        with self.block():
            self.traverse(node.body)
        # collapse nested ifs into equivalent elifs.
        while node.orelse and len(node.orelse) == 1 and isinstance(node.orelse[0], If):
            node = node.orelse[0]
            self.begin_elseif(node)
            with self.block():
                self.traverse(node.body)
        # final else
        if node.orelse:
            self.fill("ELSE")
            with self.block():
                self.traverse(node.orelse)
        self.end_if()

    def begin_if(self, node):
        self.fill("IF ")
        self.traverse(node.test)
        self.write('THEN')

    def end_if(self):
        self.fill('END IF')

    def begin_elseif(self, node):
        self.fill("ELSEIF ")
        self.traverse(node.test)
        self.write(" THEN")

    def end_elseif(self, node):
        pass

    def _render_where(self, where):
        for i, kw in enumerate(where.keywords):
            if i > 0:
                self.write(' AND ')
            self.write(f'{kw.arg}=(')
            self.traverse(kw.value)
            self.write(')')

    def visit_select_count(self, counter, where):
        self.write('SELECT COUNT(*)')
        self.write(' FROM ' + apps[counter.args[0].value]._meta.db_table)
        self.write(' WHERE ')
        self._render_where(where)

    def visit_where(self, node: ast.Attribute):
        prev = node.func.value
        # Check if prev node is the set clause
        if isinstance(prev.func, ast.Attribute) and prev.func.attr == 'set':
            self.visit_update(prev, node)
        elif isinstance(prev.func, ast.Name) and prev.func.id == 'Count':
            self.visit_select_count(prev, node)

    def visit_ClassDef(self, node):
        self._cur_model = node
        for kw in node.keywords:
            self._name = kw.value.value
            self._model = apps[self._name]
        self._write_docstring_and_traverse_body(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        if node.name in COMMON_TRIGGER_NAMES:
            self.visit_trigger(node)
        else:
            super().visit_FunctionDef(node)

    cmpops = {
        "Eq": "=",
        "NotEq": "!=",
        "Lt": "<",
        "LtE": "<=",
        "Gt": ">",
        "GtE": ">=",
        "Is": "is",
        "IsNot": "is not",
        "In": "in",
        "NotIn": "not in",
    }

    def visit_Pass(self, node):
        self.fill('-- pass')

    def visit_trigger(self, trigger: ast.FunctionDef):
        # check by common trigger names
        if trigger.name in COMMON_TRIGGER_NAMES:
            tr_name = f'_tr_{self._name.replace(".", "_")}_{TRIGGER_SUFFIX[trigger.name]}'
            ev_name = trigger.name.replace('_', ' ').upper()
        else:
            tr_name = trigger.name
        self.begin_trigger(trigger, tr_name, ev_name)
        with self.block():
            self.traverse(trigger.body)
        self.end_trigger(trigger, tr_name, ev_name)
        self.end_sql()

    def begin_trigger(self, v_trigger: ast.FunctionDef, name: str, event: str):
        self.fill(f'CREATE TRIGGER {name} ON {self._model._meta.db_table} {event}\nAS\nBEGIN')

    def end_trigger(self, v_trigger: ast.FunctionDef, name: str, event: str):
        self.fill('END;')

    def generate_sql(self, code: bytes):
        node = ast.parse(code)
        self.visit(node)
        return self.pending_operations

