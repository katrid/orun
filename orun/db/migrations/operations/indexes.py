from typing import TYPE_CHECKING

from orun.db.metadata import Table, Index
from .base import Operation

if TYPE_CHECKING:
    from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class IndexOperation(Operation):
    atomic = True
    postpone = True

    def __init__(self, table: Table, index: Index):
        self.table = table
        self.index = index


class CreateIndex(IndexOperation):
    def describe(self) -> str:
        return f'Add index "{self.index.name}" on table {self.table.name} ({self.index})'

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        editor.create_index(self.table, self.index)


class DropIndex(IndexOperation):
    def describe(self) -> str:
        return f'Remove index "{self.index.name}" on table {self.table.name}'

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        editor.drop_index(self.table, self.index)


class RenameIndex(IndexOperation):
    pass
