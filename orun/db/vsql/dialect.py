from sqlparse import parse, sql
from sqlparse.sql import Identifier, IdentifierList, Token, Function
from sqlparse import tokens as T

from orun.apps import apps
from orun.db import connection


def echo(sql: str, context=None):
    return connection.ops.dialect().prepare(sql)



