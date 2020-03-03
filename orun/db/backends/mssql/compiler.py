from orun.db.models.sql import compiler


class SQLCompiler(compiler.SQLCompiler):
    def as_sql(self, with_limits=True, with_col_aliases=False):
        sql, params = super().as_sql(with_limits=False, with_col_aliases=with_col_aliases)
        if with_limits:
            if self.query.high_mark is not None:
                sql = '{} OFFSET {} ROWS FETCH NEXT {} ROWS ONLY'.format(sql, self.query.low_mark, self.query.high_mark)
        return sql, params


class SQLInsertCompiler(compiler.SQLInsertCompiler, SQLCompiler):
    pass


class SQLDeleteCompiler(compiler.SQLDeleteCompiler, SQLCompiler):
    pass


class SQLUpdateCompiler(compiler.SQLUpdateCompiler, SQLCompiler):
    pass


class SQLAggregateCompiler(compiler.SQLAggregateCompiler, SQLCompiler):
    pass
