from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from orun.db.backends.base.schema import BaseDatabaseSchemaEditor

from orun.db.metadata import Table, Constraint
from .base import Operation


class ConstraintOperation(Operation):
    postpone = True

    def __init__(self, table: Table, constraint: Constraint):
        self.table = table
        self.constraint = constraint


class CreateConstraint(ConstraintOperation):
    def describe(self) -> str:
        return f'Create constraint "{self.constraint.name}" on table {self.table.name} ({self.constraint})'

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        editor.create_constraint(self.table, self.constraint)


class DropConstraint(ConstraintOperation):
    def describe(self) -> str:
        return f'Drop constraint "{self.constraint.name}" on table {self.table.name} ({self.constraint})'

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        editor.create_constraint(self.table, self.constraint)
