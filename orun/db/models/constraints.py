from typing import TYPE_CHECKING
from orun.db import metadata

if TYPE_CHECKING:
    from orun.db.models.base import Model

__all__ = ['Constraint', 'CheckConstraint', 'UniqueConstraint']


class Constraint:
    type: str = None
    model: 'Model' = None

    def __init__(self, *, name: str = None, deferred: bool = False):
        """

        :param name: If a name is not provided, one will be generated using the model's _meta information.
        :param deferred: If True, it will be deferred until the end of the transaction.
        """
        self.name: str = name
        self.deferred = deferred

    def get_metadata(self):
        return metadata.Constraint(self.name, type=self.type, deferrable=self.deferred, expressions=self.get_expressions())

    def get_expressions(self):
        return None


class CheckConstraint(Constraint):
    type = 'CHECK'

    def __init__(self, name: str, check: str, /, *, deferred: bool = False):
        super().__init__(deferred=deferred)
        self.check = check

    def get_expressions(self):
        return self.check


class UniqueConstraint(Constraint):
    type = 'UNIQUE'

    def __init__(self, fields: list[str], /, *, name: str = None, deferred: bool = False):
        super().__init__(name=name, deferred=deferred)
        self.fields = fields

    def get_expressions(self):
        return self.fields

    def clone(self):
        return self.__class__(self.fields, name=self.name, deferred=self.deferred)

