from sqlparse import parse
from . import triggers


def echo(s: str):
    return s


def trigger(fn):
    if fn.__name__ == '__before_insert':
        return triggers.BeforeInsert(fn)
    if fn.__name__ == '__after_insert':
        return triggers.AfterInsert(fn)
    if fn.__name__ == '__before_update':
        return triggers.BeforeUpdate(fn)
    if fn.__name__ == '__after_update':
        return triggers.AfterUpdate(fn)
    if fn.__name__ == '__before_delete':
        return triggers.BeforeDelete(fn)
    if fn.__name__ == '__after_delete':
        return triggers.AfterDelete(fn)


def after_insert():
    pass


def EXEC_SQL(*args, **kwargs):
    pass


class Compiler:
    def __init__(self):
        pass

    def execute(self, params):
        pass


def prepare(command: str, **kwargs):
    pass


def execute(command: str, **kwarrgs):
    pass
