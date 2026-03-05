from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class Operation:
    atomic = False
    postpone = False

    def describe(self) -> str:
        return self.__class__.__name__

    def apply(self, editor: 'BaseDatabaseSchemaEditor'):
        raise NotImplementedError('Subclasses must implement the apply method.')
