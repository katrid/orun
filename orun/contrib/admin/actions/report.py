from typing import Optional, Type
from enum import Enum
import re
import datetime
import decimal

from jinja2 import Template
from orun.db import connection
from orun.db.models.fields import datatype_map
from orun.core.exceptions import ObjectDoesNotExist
from orun.http import HttpRequest
from orun.apps import apps
from orun.template import loader
from .actions import Action
from .params import Params, Param
from . import grid


class Orientation(Enum):
    AUTO = 0
    PORTRAIT = 1
    LANDSCAPE = 2


class ReportAction(Action):
    owner_type = 'base'
    creator = None
    datatype_map = datatype_map
    name: str = None
    title: str = None
    category: str = None
    sql: Optional[str] = None
    model: Optional[str] = None
    Params: Type = None
    params: Params = None
    group_by: list[str] = None
    Fields: Type = None
    fields: list[str] = None
    columns: list[str] = None
    total: dict[str, str] = None
    List: Type = None
    list: grid.Grid = None
    orientation: Orientation = Orientation.AUTO

    def __init__(self, request: HttpRequest = None, params=None):
        super().__init__(request)
        self.params: list = params
        self._values = {}
        if params:
            for p in params:
                k = p['name']
                op = p['op']
                self._values[f'{k}1'] = self._values[k] = p.get('value1')
                if 'value2' in p:
                    self._values[f'{k}2'] = p['value2']
                elif op == 'between':
                    self._values[f'{k}2'] = None
                elif op == 'in' and 'value1' in p:
                    self._values[k] = ''.join([str(s) if isinstance(s, (int, float)) or (isinstance(s, str) and s.isnumeric()) else "'" + str(s).replace("'", "''") + "'" for s in p.get('value1') if s is not None])

    @classmethod
    def update_info(cls):
        import orun.contrib.admin.models
        if cls.model and cls.model not in apps.models:
            print('Model not found', cls.model)
            return
        name = cls.name
        if cls.model and not name:
            model = apps.models[cls.model]
            name = cls.name or model._meta.verbose_name_plural
        cat = cls.category
        if cat:
            try:
                cat = orun.contrib.admin.models.ReportCategory.objects.get(name=cat)
            except ObjectDoesNotExist:
                cat = orun.contrib.admin.models.ReportCategory.objects.create(name=cat)
        action_info = {
            'usage': cls.usage,
            'category': cat,
            'description': cls.description,
            'name': name,
            'model': cls.model,
            'owner_type': 'base',
            'qualname': cls.get_qualname(),
            'report_type': 'grid',
        }
        return cls._register_object(
            orun.contrib.admin.models.ReportAction, cls.get_qualname(), action_info
        )

    def _get_context(self):
        return {}

    def _apply_param(self, param, values):
        sql = []
        for k, v in param.items():
            if k == 'OR':
                return ' OR '.join([self._apply_param(p, values) for p in v])
            cond = k.split('__')
            field = cond[0]
            if len(cond) > 1:
                for lookup in cond[1:]:
                    # name = 'param_%s' % (len(values) + 1)
                    if lookup == 'icontains':
                        s = f'"{field}" like ?'
                        v = f'%{v}%'
                    else:
                        s = f'"{field}" = ?'
                    values.append(v)
                    sql.append('(%s)' % s)
            else:
                # name = 'param_%s' % (len(values.values()) + 1)
                values.append(v)
                s = f'"{field}" = ?'
                sql.append('(%s)' % s)
        return '(%s)' % ' OR '.join(sql)

    def _get_sqltype(self, param):
        if param.type is int:
            return 'int'
        elif param.type is float:
            return 'float'
        elif param.type is decimal.Decimal:
            return 'decimal(31, 8)'
        elif param.type is bool:
            return 'bit'
        elif param.type is datetime.date:
            return 'date'
        elif param.type is datetime.datetime:
            return 'datetime'
        else:
            return 'varchar(max)'

    def _prepare(self, sql: str, values=None):
        vars = []
        params = []
        select = []
        if values is None:
            values = {}
        _sql = ''
        # macro/template evaluation
        if sql and '/*%' in sql:
            sql = Template(sql, '/*%', '%*/').render(values)
        if connection.vendor == 'mssql':
            vars.append('SET DATEFORMAT ymd')
            for k, v in self._values.items():
                vars.append(f'declare @{k} varchar(max)')
                if not isinstance(v, list):
                    params.append(values.get(k, v))
                    select.append(f'@{k} = ?')
            if vars:
                _sql = '\n'.join(vars)
                _sql += f'''\nselect {",".join(select)}\n'''
            _sql += sql.replace(':', '@')
        elif connection.vendor == 'postgresql':
            _sql = re.sub(r':(\w+)', r'%(\1)s', sql)
            params = dict(self._values)
        else:
            _sql += sql

        cur = connection.cursor()
        cur.execute(_sql, params)
        self.fields = cur.cursor.description
        rows = [[float(col) if isinstance(col, decimal.Decimal) else col for col in row] for row in cur.fetchall()]
        return rows, cur

    def _apply_search(self, sql, params, values):
        if params:
            where = []
            for param in params:
                where.append(self._apply_param(param, values))
            where = ' AND '.join(where)
            sql = """SELECT * FROM (%s) as q1 WHERE %s""" % (sql, where)
        return sql

    def get_queryset(self, with_description=False, as_dict=False, fields=None, where=None):
        pass

    def read(self, where=None, with_description=False, as_dict=False, *args, **kwargs):
        params = {}
        if where:
            params.update(where)
        values = []
        sql = self.sql
        if params:
            # apply query search params
            # sql = self._apply_search(sql, where, values)
            pass
        rows, cur = self._prepare(sql, params)
        desc = cur.cursor.description
        if with_description:
            fields = [
                {'name': f[0], 'type': connection.introspection.get_field_type(f[1], f) if f[1] in connection.introspection.data_types_reverse else f[1].__name__, 'size': f[2]}
                for f in desc
            ]
        else:
            fields = [f[0] for f in desc]
        return rows, fields

    @classmethod
    def _get_params_info(cls):
        if cls.Params and not cls.params:
            if not issubclass(cls.Params, Params):
                cls.params = Params.from_class(cls.Params)
        if cls.params:
            return cls.params.get_params_info()

    @classmethod
    def _get_fields_info(cls):
        if cls.Fields:
            pass
        return cls.fields

    @classmethod
    def _get_template_info(cls, request: HttpRequest):
        templ = loader.get_template('admin/reports/template.jinja2').render(request=request)
        if cls.List:
            if not issubclass(cls.List, grid.Grid):
                res = grid.Grid.from_class(cls.List).get_metadata()
                res['reportTemplate'] = templ
                return res
        elif cls.list:
            res = cls.list.get_metadata()
            res['reportTemplate'] = templ
            return res
        else:
            return {
                'reportTemplate': templ,
            }

    @classmethod
    def prepare(cls):
        if cls.template_name:
            if cls.template_name.endswith('.pug'):
                from orun.template.backends.pug import Parser
                templ = loader.find_template(cls.template_name)
                with open(templ, 'r', encoding='utf-8') as f:
                    report = Parser.from_string(f.read())
                    params = report.find('params')
                if not cls.params and params:
                    cls.params = Params.from_node(params)
                if not cls.List and not cls.list:
                    lst = report.find('list')
                    cls.list = grid.Grid.from_node(lst)
                    if not cls.sql:
                        sql = lst.find('sql')
                        if sql:
                            cls.sql = sql.text
                    if not cls.group_by:
                        group = lst.find('group')
                        if group:
                            cls.group_by = [group.attrib['field']]

    @classmethod
    def get_metadata(cls, request: HttpRequest):
        cls.prepare()
        return {
            'name': cls.title or cls.name,
            'params': cls._get_params_info(),
            'fields': cls.fields,
            'groupBy': cls.group_by,
            'columns': cls.columns,
            'orientation': cls.orientation.value,
            'template': cls._get_template_info(request),
        }

    def execute(self, **kwargs):
        data, fields = self.read(with_description=True, where=self._values)
        return {
            'data': data,
            'fields': fields,
        }
