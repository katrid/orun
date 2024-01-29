from typing import List, Any, Optional, Dict, Type, TYPE_CHECKING
from dataclasses import dataclass, field

from orun.apps import apps

if TYPE_CHECKING:
    from orun.db.models import Model, Field


class Metadata:
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
    model: str
    name: str
    schema: str = None
    tablespace: str = None
    indexes: List['Index'] = None
    constraints: List['Constraint'] = None
    columns: List['Column'] = None

    def __post_init__(self):
        self.columns = []
        self.indexes = []
        self.constraints = []

    def dump(self):
        return {
            'model': self.model, 'name': self.name, 'schema': self.schema, 'tablespace': self.tablespace,
            'columns': [c.dump() for c in self.columns]
        }

    @classmethod
    def load(cls, data: dict):
        table = cls(model=data['model'], name=data['name'], schema=data['schema'], tablespace=data['tablespace'])
        table.indexes = [Index(**i) for i in data.get('indexes', [])]
        table.constraints = [Constraint(**c) for c in data.get('constraints', [])]
        table.columns = [Column(**c) for c in data['columns']]
        return table


@dataclass(slots=True, init=True)
class Column:
    name: str
    type: str
    params: List[str] = None
    null: bool = True
    pk: bool = False
    default: str = None
    tablespace: str = None
    computed: str = None
    autoinc: bool = False
    fk: dict = None
    attributes: dict = None
    field: 'Field' = None

    def dump(self):
        return {
            'name': self.name, 'type': self.type, 'params': self.params, 'null': self.null, 'pk': self.pk,
            'default': self.default, 'tablespace': self.tablespace, 'computed': self.computed, 'autoinc': self.autoinc,
            'fk': self.fk, 'attributes': self.attributes,
        }


@dataclass(slots=True, init=True)
class Index:
    name: str
    type: str = None
    tablespace: str = None
    expressions: List[str] = None
    auto_created: bool = False
    model: Type['Model'] = None


@dataclass(slots=True, init=True)
class Constraint:
    name: str
    type: str = None
    attributes: dict = None
    auto_created: bool = False
    model: Type['Model'] = None
