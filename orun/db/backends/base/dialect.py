import re
from sqlparse import parse, sql
from sqlparse.sql import Identifier, IdentifierList, Token, Function
from sqlparse import tokens as T

from orun.apps import apps


class Dialect:
    def prepare(self, sql: str) -> str:
        # todo rewrite sql parser
        root = parse(sql)[0]
        return str(self.iter_tokens(root))

    def iter_tokens(self, node):
        visit = None
        for child in node.tokens:
            if child.is_whitespace:
                continue
            elif child.ttype is T.DML and child.normalized == 'SELECT':
                visit = self.visit_select
            elif child.is_keyword and child.normalized == 'FROM':
                visit = self.visit_from
            elif child.ttype is T.DML and child.is_keyword and child.normalized == 'UPDATE':
                visit = self.visit_from
            elif child.is_keyword and child.normalized == 'SET':
                visit = self.visit_update
            elif child.ttype is T.Punctuation:
                continue
            else:
                visit(child)
        return node

    def visit_select(self, node):
        if isinstance(node, IdentifierList):
            for col in node.tokens:
                if col.ttype is T.Punctuation:
                    continue
                elif col.ttype is T.Whitespace:
                    continue
                self.visit_column(col)
        elif isinstance(node, Identifier):
            self.visit_column(node)

    def visit_update(self, node):
        pass

    def visit_column(self, node):
        if node.is_group and isinstance(node, sql.Function):
            self.visit_function(node)

    def visit_function(self, node):
        pass

    def visit_from(self, node):
        # adjust the identifier by its table name
        if isinstance(node, IdentifierList):
            for child in node.tokens:
                self.visit_from(child)
        elif isinstance(node, Identifier):
            ident_name = node.normalized
            model = apps[ident_name]
            tokens = [Token(T.Name, model._meta.db_table)]
            if node.has_alias():
                tokens.append(Token(T.Whitespace, ' '))
                tokens.append(Token(T.Name, node.get_alias()))
            node.tokens = tokens
