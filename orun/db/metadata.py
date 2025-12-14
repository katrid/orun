from typing import List, Any, Optional, Sequence
from dataclasses import dataclass

from orun.apps import apps


__all__ = ['Metadata', 'Table', 'Column', 'Index', 'Constraint']


class Metadata:
    schemas: list[str]
    tables: dict[str, 'Table']

    def __init__(self, editor=None):
        self.tables = {}
        self.editor = editor

    def dump(self):
        return {
            'tables': [t.dump() for t in self.tables.values()]
        }

    def load(self, meta: dict):
        if tables := meta['tables']:
            self.tables = {t['model']: Table.load(t) for t in tables}

    def load_all(self):
        self.tables = {
            k: m._meta.get_metadata(self.editor)
            for k, m in apps.models.items() if m._meta.can_migrate(self.editor.connection)
        }


@dataclass(slots=True)
class Table:
    model: str = None
    name: str = None
    schema: str = None
    tablespace: str = None
    indexes: dict[str, 'Index'] = None
    constraints: dict[str, 'Constraint'] = None
    columns: dict[str, 'Column'] = None
    tablename: str = None

    def __post_init__(self):
        self.columns = {}
        self.indexes = {}
        self.constraints = {}

    def dump(self):
        return {
            'model': self.model, 'name': self.name, 'schema': self.schema, 'tablespace': self.tablespace,
            'columns': {k: c.dump() for k, c in self.columns.items()},
            'constraints': {k: c.dump() for k, c in self.constraints.items()},
            'indexes': {k: c.dump() for k, c in self.indexes.items()},
        }

    @classmethod
    def load(cls, data: dict):
        """Load metadata information from database"""
        table = cls(model=data['model'], name=data['name'], schema=data['schema'], tablespace=data['tablespace'])
        table.indexes = {k: Index(**i) for k, i in data.get('indexes', {}).items()}
        table.constraints = {k: Constraint(**c) for k, c in data.get('constraints', {}).items()}
        cols = data['columns']
        if isinstance(cols, dict):
            table.columns = {k: Column(**c) for k, c in data['columns'].items()}
        else:
            table.columns = {c['name']: Column(**c) for c in data['columns']}
        return table


@dataclass(slots=True, init=True)
class Column:
    name: str
    type: str
    params: Optional[List[str]] = None
    null: bool = True
    pk: bool = False
    default: Any = None
    tablespace: str = None
    computed: str = None
    stored: bool = True
    autoinc: bool = False
    fk: dict = None
    attributes: dict = None
    unique: bool = False
    field = None

    def __post_init__(self):
        if self.type.startswith('orun.db.models'):
            self.type = self.type.split('.')[-1]

    def dump(self):
        return {
            'name': self.name, 'type': self.type, 'params': self.params, 'null': self.null, 'pk': self.pk,
            'default': self.default, 'tablespace': self.tablespace, 'computed': self.generated, 'autoinc': self.autoinc,
            'fk': self.fk, 'attributes': self.attributes, 'unique': self.unique,
        }

    @property
    def generated(self):
        return self.computed


@dataclass(slots=True, init=True)
class Index:
    name: str
    type: str = None
    tablespace: str = None
    expressions: List[str] = None
    auto_created: bool = False
    # model: Type['Model'] = None

    def dump(self):
        return {
            'name': self.name,
            'type': self.type,
            'tablespace': self.tablespace,
            'expressions': self.expressions,
            'auto_created': self.auto_created,
        }


@dataclass(slots=True, init=True)
class Constraint:
    name: str
    type: str = None
    deferrable: str = False
    expressions: List[str] = None
    references: List[List[str]] = None
    on_delete: str = None
    on_update: str = None
    auto_created: bool = False

    def dump(self):
        return {
            'name': self.name,
            'type': self.type,
            'deferrable': self.deferrable,
            'expressions': self.expressions,
            'references': self.references,
            'on_delete': self.on_delete,
            'on_update': self.on_update,
            'auto_created': self.auto_created,
        }
