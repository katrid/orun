from typing import Sequence

from orun.db import metadata

__all__ = ['Index', 'UniqueIndex']


class Index:
    type: str = None

    def __init__(self, expressions: Sequence[str], /, *, name: str = None):
        self.name = name
        self.expressions = expressions

    def get_metadata(self):
        return metadata.Constraint(self.name, type=self.type, expressions=self.expressions)


class UniqueIndex(Index):
    type = 'UNIQUE'
