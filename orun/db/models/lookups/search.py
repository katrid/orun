from orun.db.models.lookups import Lookup
from orun.db.models.fields import CharField, Field
from orun.db.models.expressions import Func


class SearchQuery(Func):
    def as_sql(self, compiler, connection, function=None, template=None):
        sql, params = super().as_sql(compiler, connection, function, template)
        if self.invert:
            sql = '!!(%s)' % sql
        return sql, params


@Field.register_lookup
class Search(Lookup):
    lookup_name = 'search'

    def get_db_prep_lookup(self, value, connection):
        if value:
            if ' ' in value:
                value = ' AND '.join([f'"{v}*"' for v in value.split(' ') if v])
            else:
                value = f'"{value}*"'
        return ('%s', [value])

    def as_mssql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        params = lhs_params + rhs_params
        return 'contains(%s, %s)' % (lhs, rhs), params
