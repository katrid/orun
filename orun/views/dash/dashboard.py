import datetime
import decimal
from collections import defaultdict

from orun.apps import apps
from orun.db import connection


class Graph(dict):
    def __init__(self, data=None, layout=None):
        self['data'] = data
        default_layout = {
            'hovermode': 'x unified',
        }
        if layout:
            default_layout.update(layout)
        self['layout'] = default_layout


class Trace:
    pass


class Bar(dict):
    hovertemplate = '%{label} (%{y:,.2f})'
    texttemplate = '%{y:,.2f}'

    def __init__(self, x=None, y=None, name=None, barmode=None, textposition=None, hovertemplate=None, texttemplate=None):
        if x:
            self['x'] = x
        if y:
            self['y'] = y
        if name:
            self['name'] = name
        if barmode:
            self['barmode'] = barmode
        if textposition:
            self['textposition'] = textposition
        self['hovertemplate'] = hovertemplate or self.hovertemplate
        self['texttemplate'] = texttemplate or self.texttemplate
        self['type'] = 'bar'


class Param:
    name: str
    value: any
    type: type

    def __init__(self, name=None, type=None, value=None):
        self.name = name
        self.type = type
        self.value = value


class Params(dict):
    def __getitem__(self, item):
        if isinstance(item, int) and not item in self:
            return list(self.values())[item]
        return super().__getitem__(item)


class DataSource:
    def __init__(self, sql: str=None, params=None, transform_cols=None, transform_rows=None):
        self.sql = sql
        self.params = params or {}
        self.fields: list = []
        self.transform_cols = transform_cols
        self.transform_rows = transform_rows

    @property
    def params(self):
        return self._params

    @params.setter
    def params(self, value):
        params = Params()
        if isinstance(value, dict):
            for k, v in value.items():
                if not isinstance(v, Param):
                    if isinstance(v, type):
                        v = Param(k, v)
                    else:
                        v = Param(k, type(v))
                params[k] = v
        self._params = params

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

    def _prepare(self, values):
        vars = []
        params = []
        select = []
        if values is None:
            values = {}
        for k, v in self.params.items():
            vars.append(f'declare @{k} {self._get_sqltype(v)}')
            params.append(values.get(k, self._params[k].value))
            select.append(f'@{k} = ?')
        sql = ''
        if vars:
            sql = '\n'.join(vars)
            sql += f'''\nselect {",".join(select)}\n'''
        sql += self.sql
        cur = connection.cursor()
        cur.execute(sql, params)
        self.fields = cur.cursor.description
        rows = cur.fetchall()
        if self.transform_rows:
            res = []
            for c in self.transform_cols:
                res.append([row[c] for row in rows])
            for r in self.transform_rows:
                res.append([row[r] for row in rows])
            return res
        return rows

    def execute(self, params=None):
        return [list(row) for row in self._prepare(params)]


class Dashboard:
    def params(self):
        return []

    def api_callback(self, prop, value, values):
        pass

    def api_load(self, **kwargs):
        model = kwargs.get('model')
        if model:
            cls = apps.models[model]
            return cls.admin_get_view_info(view_type=kwargs.get('view_type'))

    def api_search(self, **kwargs):
        model = kwargs.get('model')
        if model:
            cls = apps.models[model]
            return cls.api_search(where=kwargs.get('where'))
