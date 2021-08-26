from orun.db.backends.base import dialect


class Dialect(dialect.Dialect):
    def visit_function(self, node):
        fn = node.tokens[0]
        if fn.normalized.upper() == 'COALESCE':
            fn.tokens[0].value = 'isnull'
