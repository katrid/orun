from typing import TYPE_CHECKING

from .base import Operation
from orun.db import metadata
if TYPE_CHECKING:
    from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class TriggerOperation(Operation):
    atomic = True
    postpone = True

    def __init__(self, table: metadata.Table, trigger: metadata.Trigger):
        self.table = table
        self.trigger = trigger


class CreateTrigger(TriggerOperation):
    def describe(self) -> str:
        return f'Create trigger {self.trigger.name} on table {self.table.tablename}'


class DropTrigger(TriggerOperation):
    def describe(self) -> str:
        return f'Drop trigger {self.trigger.name} on table {self.table.tablename}'


class AggTriggerOperation(TriggerOperation):
    def __init__(self, table: metadata.Table, trigger: metadata.AggTrigger):
        self.table = table
        self.trigger = trigger


class CreateAggTrigger(TriggerOperation):
    def describe(self) -> str:
        return f'Create agg_trigger {self.trigger.name} on table {self.table.tablename}'

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        editor.create_index(self.table, self.index)


class DropAggTrigger(TriggerOperation):
    def describe(self) -> str:
        return f'Drop agg_trigger {self.trigger.name} on table {self.table.tablename}'

