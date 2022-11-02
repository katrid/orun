from typing import List, Any, Optional
from dataclasses import dataclass, field

from orun.db.models.fields import NOT_PROVIDED


@dataclass(slots=True, init=True)
class Table:
    name: str
    schema: str = None
    indexes: List['Index'] = None
    constraints = None
    columns: List['Column'] = None


@dataclass(slots=True)
class Column:
    name: str
    datatype: Any
    null: bool = True
    primary_key: bool = False
    default: Any = NOT_PROVIDED
    tablespace: str = None
    computed: str = None
    type_suffix: str = None


class Index:
    name: str = None
    columns: List[str] = None


class Constraint:
    name: str = None
    expr: str = None
