from typing import Sequence

from orun.db import metadata

__all__ = ['Index', 'UniqueIndex']


class Index:
    type: str = None

    def __init__(self, expressions: Sequence[str], /, *, name: str = None):
        self.name = name
        self.expressions = expressions

    def get_metadata(self):
        return metadata.Index(name=self.name, type=self.type, expressions=self.expressions)

    def clone(self):
        return self.__class__(self.expressions, name=self.name)


class UniqueIndex(Index):
    type = 'UNIQUE'
