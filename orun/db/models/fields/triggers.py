from typing import Annotated, Generator, Literal, Sequence, Self, Any
from dataclasses import dataclass

from orun.db.models import Field
from orun.db.models.base import Model
from . import Field


def resolve_field_path(model: type[Model], field_path: str):
    return (
        f
        for s in field_path.split('.')
        if (f := model._meta.fields.get(s)) and ((f.many_to_one and (model := f.related_model)) or not f.many_to_one)
    )


@dataclass(slots=True)
class JoinInfo:
    lmodel: type[Model]
    rmodel: type[Model]
    on: tuple[Field, Field]
    join_type: Literal['inner', 'left', 'right', 'full'] = 'inner'

    def __post_init__(self):
        if self.on and self.on[0].null:
            self.join_type = 'inner'


def _get_joins(field_path: Sequence[Field]):
    return (JoinInfo(f.model, f.related_model, (f, f.remote_field.target_field)) for f in field_path if f.many_to_one)


def _get_default_where(model: type[Model], fk_field: Field, trigger_obj: Literal['NEW', 'OLD']) -> str:
    return f'{fk_field.remote_field.target_field.column} = {trigger_obj}."{model._meta.pk.column}"'


@dataclass
class TriggerUpdateStatement:
    table: type[Model]
    joins: Sequence[JoinInfo]
    set: dict[Field, Any]
    where: str


class AggregateToField:
    field: str = None
    aggregate_to: str = None
    aggregation_expr = None
    where: list[str]
    agg_field_path: list[Field]


class TriggerDefinition:
    pass


class AggFieldTrigger:
    def __init__(self, field, expression, *, suffix=None, prefix=None):
        self.field = field
        self.suffix = suffix
        self.model = field.model
        self.expression = expression
        self.prefix = prefix
        self.events = ('insert', 'update', 'delete')

    def __repr__(self) -> str:
        return 'AggTrigger(' + ','.join(f'After{ev.capitalize()}({repr(self.expression)})' for ev in self.events) + ')'

    @classmethod
    def from_field(cls, field: Field):
        return cls(field, field.aggregate_from)

    def get_name(self, event: str | None = None):
        name = self.field.name
        if event:
            name = f'{event[0]}_{name}'
        if self.prefix:
            name = f'{self.prefix}_{name}'
        if self.suffix:
            name = f'{name}_{self.suffix}'
        return name


class FieldTriggerAggregation:
    def __init__(self):
        self.insert = []
        self.update = []
        self.delete = []

    @classmethod
    def from_dict(cls, field: Field, fields_agg: dict[str, dict[str, str]]):
        """
        Return a FieldTriggerAggregation instance representing automatic triggers for aggregate field from a dict
        :param field:
        :param fields_agg:
        :return:
        """
        model = field.model
        field_trigger = cls()
        for field_agg, agg_def in fields_agg.items():
            path = tuple(resolve_field_path(model, field_agg))
            joins = tuple(_get_joins(path))
            new = TriggerUpdateStatement(
                joins[-1].rmodel, joins[:-1], {path[-1]: field}, _get_default_where(model, path[0], 'NEW')
            )
            old = TriggerUpdateStatement(
                joins[-1].rmodel, joins[:-1], {path[-1]: field}, _get_default_where(model, path[0], 'OLD')
            )
            field_trigger.insert.append(new)
            field_trigger.update.extend([new, old])
            field_trigger.delete.append(old)

    @classmethod
    def from_string(cls, field: Field, field_agg: str) -> Self:
        """
        Return a FieldTriggerAggregation instance representing automatic triggers for aggregate field
        :param field:
        :param field_agg:
        :return:
        """
        model = field.model
        field_trigger = cls()
        path = tuple(resolve_field_path(model, field_agg))
        joins = tuple(_get_joins(path))
        new = TriggerUpdateStatement(
            joins[-1].rmodel, joins[:-1], {path[-1]: field}, _get_default_where(model, path[0], 'NEW')
        )
        old = TriggerUpdateStatement(
            joins[-1].rmodel, joins[:-1], {path[-1]: field}, _get_default_where(model, path[0], 'OLD')
        )
        field_trigger.insert = [new]
        field_trigger.update = [new, old]
        field_trigger.delete = [old]
        return field_trigger
