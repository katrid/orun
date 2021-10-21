from .base import *


class Count:
    def __init__(self, *args, **kwargs):
        pass

    def where(self, *args, **kwargs):
        pass


class Update:
    def __init__(self, *args, **kwargs):
        pass

    def set(self, *args, **kwargs):
        pass

    def where(self, *args, **kwargs):
        pass


class ExecSQL:
    """Create an inline SQL execution statement"""

    def __init__(self, sql: str):
        pass


def dump(conn, obj):
    pass
