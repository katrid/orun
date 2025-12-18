from typing import TYPE_CHECKING, TypeAlias
from collections import defaultdict

if TYPE_CHECKING:
    from .options import Options
    from orun.db.backends.base.schema import BaseDatabaseSchemaEditor


class New:
    pass


class Old:
    pass


SQLString: TypeAlias = str
SQLStatement: TypeAlias = str
ModelName: TypeAlias = str
FieldName: TypeAlias = str


class AggUpdateStatement:
    target_table: str
    set_clause: dict[str, str]
    from_tables: list[str]
    where: list[str]

    def __init__(self):
        self.set_clause = {}
        self.from_tables = []
        self.where = []

    def _resolve_refs(self, expr: str):
        pass


class Trigger:
    def __init__(self, stmts: list[str]):
        self.statements = stmts


class AggTrigger:
    updates: list[AggUpdateStatement]

    def __init__(self):
        self.updates = []

    @classmethod
    def from_dict(cls, agg: dict[str, str]):
        """
        Generates a trigger from dict representation of aggregate fields. E.g.:
        {'foreign_field': 'case other_fk.char_field when 'X' then 1 else 0 end'}
        :param agg:
        :return:
        """
        pass


def collect_triggers(options, editor: 'BaseDatabaseSchemaEditor'):
    def resolve_refs(expr: str):
        cur_model = options.model
        return [
            tuple(
                (f, cur_model) for s in token.split('.')
                if (f := cur_model._meta.fields[s]) and f.many_to_one and (cur_model := f.related_model)
            )
            for token in expr.split() if '.' in token
        ]

    def resolve_agg(agg_field):
        if isinstance(agg_field, dict):
            for k, v in agg_field.items():
                cur_model = options.model
                fk_path = tuple(
                    (f, cur_model) for s in k.split('.')
                    if (f := cur_model._meta.fields[s]) and f.many_to_one and (cur_model := f.related_model)
                )
                agg_refs[fk_path].append([v, k.split('.')[-1], resolve_refs(v)])

    def resolve_fk(field_name: str):
        joins = []
        cur_model = options.model
        for s in field_name.split('.'):
            f = cur_model._meta.fields[field_name]
            if f.many_to_one:
                joins.append(f.related_model)
                cur_model = f.related_model
                continue
            break

    agg_refs = defaultdict(list)
    for field in options.local_concrete_fields:
        if field.aggregate_to:
            resolve_agg(field.aggregate_to)
    if agg_refs:
        _gen_update_stmts(agg_refs)


def _gen_update_stmts(agg_refs):
    stmts = []
    # TODO use orm
    for joins, refs in agg_refs.items():
        fk, target_model = joins[-1]
        expr = refs[0]
        target_field = refs[1]
        additional_models = refs[1]
        sql = f'''UPDATE {target_model._meta.db_table} SET {target_field} = ({expr})'''
        where = []
        if len(joins) > 1:
            sql += ' FROM ' + ', '.join([m._meta.db_table for m in joins[:-1]])
        for m in additional_models:
            if m not in joins:
                sql += ', ' + m._meta.db_table

        stmts.append(sql)
