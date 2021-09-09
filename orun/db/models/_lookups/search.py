from orun.db.models.lookups import Lookup
from orun.db.models.fields import CharField, TextField
from orun.db.models.expressions import Func


class SearchQuery(Func):
    def as_sql(self, compiler, connection, function=None, template=None):
        sql, params = super().as_sql(compiler, connection, function, template)
        if self.invert:
            sql = '!!(%s)' % sql
        return sql, params


@CharField.register_lookup
class Search(Lookup):
    lookup_name = 'search'

    def as_postgresql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        if rhs_params:
            value = rhs_params[0]
            if ' ' in value:
                value = ' & '.join([f'{v}:*' for v in value.split(' ') if v])
            else:
                value = f'{value}:*'
            rhs_params = [value]
        params = lhs_params + rhs_params
        if connection.accent_insensitive:
            search_expr = "to_tsvector('unaccent', %s) @@ to_tsquery('unaccent', %s)"
        else:
            search_expr = "to_tsvector('simple', %s) @@ to_tsquery('simple', %s)"
        return search_expr % (lhs, rhs), params

    def as_mssql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        if rhs_params:
            value = rhs_params[0]
            if ' ' in value:
                value = ' AND '.join([f'"{v}*"' for v in value.split(' ') if v])
            else:
                value = f'"{value}*"'
            rhs_params = [value]
        params = lhs_params + rhs_params
        return 'contains(%s, %s)' % (lhs, rhs), params
