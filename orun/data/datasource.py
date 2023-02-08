import re
import decimal
import datetime

from orun.db import connection
from jinja2 import Template


class Param:
    name: str
    value: any
    type: type

    def __init__(self, name=None, data_type=None, value=None):
        self.name = name
        self.type = data_type
        self.value = value


class Params(dict):
    def __getitem__(self, item):
        if isinstance(item, int) and not item in self:
            return list(self.values())[item]
        return super().__getitem__(item)

    def add(self, param: Param):
        self[param.name] = param

    def assign(self, other: dict):
        for k, v in other.items():
            if k not in self:
                self[k] = Param(k, type(v))
            self[k].value = v


class DataSource:
    def __init__(self, sql: str = None, params=None, transform_cols=None, transform_rows=None):
        self.sql: str = sql
        self.params = params or {}
        self.fields = []
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
        sql = ''
        if connection.vendor == 'mssql':
            sql = 'SET DATEFORMAT ymd\n'
            for k, v in self.params.items():
                vars.append(f'declare @{k} {self._get_sqltype(v)}')
                params.append(values.get(k, v if not isinstance(v, bytes) else None))
                select.append(f'@{k} = ?')
            if select:
                sql += '\n'.join(vars)
                sql += f'''\nselect {",".join(select)}\n'''
            sql += self.sql.replace(':', '@')
        elif connection.vendor == 'postgresql':
            sql = re.sub(r':(\w+)', r'%(\1)s', self.sql, )
            params = {k: self._params[k].value for k, v in self.params.items()}
        else:
            sql += self.sql
        if '/*%' in sql:
            sql = Template(sql, '/*%', '%*/').render(values)
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

