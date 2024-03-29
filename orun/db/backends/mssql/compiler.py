from itertools import chain

from orun.db.models.sql import compiler


class SQLCompiler(compiler.SQLCompiler):
    def as_sql(self, with_limits=True, with_col_aliases=False):
        sql, params = super().as_sql(with_limits=False, with_col_aliases=with_col_aliases)
        if with_limits:
            if self.query.high_mark is not None:
                sql = f'{sql} OFFSET {self.query.low_mark} ROWS FETCH NEXT {self.query.high_mark - self.query.low_mark} ROWS ONLY'
        return sql, params


class SQLInsertCompiler(compiler.SQLInsertCompiler, SQLCompiler):
    def as_sql(self):
        # We don't need quote_name_unless_alias() here, since these are all
        # going to be column names (so we can avoid the extra overhead).
        qn = self.connection.ops.quote_name
        opts = self.query.get_meta()
        insert_statement = self.connection.ops.insert_statement(ignore_conflicts=self.query.ignore_conflicts)
        result = ['SET NOCOUNT ON;']
        if self.returning_fields:
            result.append('DECLARE @T TABLE(ID BIGINT)')
        result.append('%s %s' % (insert_statement, qn(opts.db_table)))
        fields = self.query.fields or [opts.pk]
        result.append('(%s)' % ', '.join(qn(f.column) for f in fields))

        if self.query.fields:
            value_rows = [
                [self.prepare_value(field, self.pre_save_val(field, obj)) for field in fields]
                for obj in self.query.objs
            ]
        else:
            # An empty object.
            value_rows = [[self.connection.ops.pk_default_value()] for _ in self.query.objs]
            fields = [None]

        # Currently the backends just accept values when generating bulk
        # queries and generate their own placeholders. Doing that isn't
        # necessary and it should be possible to use placeholders and
        # expressions in bulk inserts too.
        can_bulk = (not self.returning_fields and self.connection.features.has_bulk_insert)

        placeholder_rows, param_rows = self.assemble_as_sql(fields, value_rows)

        ignore_conflicts_suffix_sql = self.connection.ops.ignore_conflicts_suffix_sql(
            ignore_conflicts=self.query.ignore_conflicts
        )
        if self.returning_fields and self.connection.features.can_return_columns_from_insert:
            r_fmt, r_params = self.connection.ops.return_insert_id()
            # Skip empty r_fmt to allow subclasses to customize behavior for
            # 3rd party backends. Refs #19096.
            if r_fmt:
                result.append(r_fmt % qn(opts.pk.column))
            result.append('INTO @T')

            if self.connection.features.can_return_ids_from_bulk_insert:
                result.append(self.connection.ops.bulk_insert_sql(fields, placeholder_rows))
                params = param_rows
            else:
                result.append("VALUES (%s)" % ", ".join(placeholder_rows[0]))
                params = [param_rows[0]]
            if ignore_conflicts_suffix_sql:
                result.append(ignore_conflicts_suffix_sql)
            result.append('SELECT ID FROM @T')
            return [(" ".join(result), tuple(chain.from_iterable(params)))]

        if can_bulk:
            result.append(self.connection.ops.bulk_insert_sql(fields, placeholder_rows))
            if ignore_conflicts_suffix_sql:
                result.append(ignore_conflicts_suffix_sql)
            return [(" ".join(result), tuple(p for ps in param_rows for p in ps))]
        else:
            if ignore_conflicts_suffix_sql:
                result.append(ignore_conflicts_suffix_sql)
            return [
                (" ".join(result + ["VALUES (%s)" % ", ".join(p)]), vals)
                for p, vals in zip(placeholder_rows, param_rows)
            ]


class SQLDeleteCompiler(compiler.SQLDeleteCompiler, SQLCompiler):
    pass


class SQLUpdateCompiler(compiler.SQLUpdateCompiler, SQLCompiler):
    def execute_sql(self, result_type):
        """
        Execute the specified update. Return the number of rows affected by
        the primary update query. The "primary update query" is the first
        non-empty query that is executed. Row counts for any subsequent,
        related queries are not available.
        """
        cursor = compiler.SQLCompiler.execute_sql(self, result_type)
        cursor.execute('select @@rowcount')
        rowcount = cursor.fetchall()[0][0]
        try:
            rows = rowcount if cursor else 0
            is_empty = cursor is None
        finally:
            if cursor:
                cursor.close()
        for query in self.query.get_related_updates():
            aux_rows = query.get_compiler(self.using).execute_sql(result_type)
            if is_empty and aux_rows:
                rows = aux_rows
                is_empty = False
        return rows


class SQLAggregateCompiler(compiler.SQLAggregateCompiler, SQLCompiler):
    pass
