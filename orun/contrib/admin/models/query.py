from decimal import Decimal
import datetime
from jinja2 import Template

from orun import api
from orun.http import HttpRequest
from orun.db import models, connection
from orun.utils.translation import gettext_lazy as _
from orun.utils.module_loading import import_string
from .action import Action


class Category(models.Model):
    name = models.CharField(label=_('Name'), translate=True)

    class Meta:
        title_field = 'name'
        name = 'ir.query.category'


class Query(models.Model):
    name = models.CharField(label=_('Name'), localize=True)
    category = models.ForeignKey(Category)
    sql = models.TextField()
    context = models.TextField()
    params = models.TextField()
    public = models.BooleanField(default=False, label='Public/External access', help_text='Has public external/anonymous access')
    published = models.BooleanField(default=True)

    class Meta:
        name = 'ir.query'

    def get_by_natural_key(self, category, name):
        return self.objects.filter({'category': category, 'name': name}).one()

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

    def _apply_search(self, sql, params, values):
        if params:
            where = []
            for param in params:
                where.append(self._apply_param(param, values))
            where = ' AND '.join(where)
            sql = """SELECT * FROM (%s) as q1 WHERE %s""" % (sql, where)
        return sql

    def _prepare_context(self, request):
        ctx = {
            'request': request,
            'user_id': self.env.user_id,
            'user': self.env.user,
        }
        # evaluate query params
        return eval(self.context, ctx)

    @api.classmethod
    def read(cls, id, with_description=False, as_dict=False, fields=None, **kwargs):
        q = cls.objects.get(pk=id)
        params = q.context
        if params:
            params = q._prepare_context()
        else:
            params = {}

        if 'filter' in kwargs:
            params.update(kwargs['filter'])
        sql = Template(q.sql).render(**params)
        values = []
        if 'params' in kwargs:
            # apply query search params
            sql = q._apply_search(sql, kwargs['params'], values)
        if (fields):
            sql = 'SELECT top 100 %s FROM (%s) as __q' % (', '.join(fields))

        cur = connection.cursor()
        cur.execute(sql, values)
        desc = cur.cursor.description
        datatype_map = {
            datetime.date: 'DateField',
            datetime.datetime: 'DateTimeField',
            str: 'CharField',
            Decimal: 'DecimalField',
            float: 'FloatField',
            int: 'IntegerField',
        }
        if with_description:
            fields = [
                {'name': f[0], 'type': datatype_map.get(f[1], 'CharField'), 'size': f[2]}
                for f in desc
            ]
        else:
            fields = [f[0] for f in desc]

        if as_dict:
            return {
                'fields': fields,
                'data': [{fields[i]: float(col) if isinstance(col, Decimal) else col for i, col in enumerate(row)} for row in cur.fetchall()],
            }
        else:
            return {
                'fields': fields,
                'data': [[float(col) if isinstance(col, Decimal) else col for col in row] for row in cur.fetchall()],
            }

    @api.classmethod
    def list_all(cls):
        return {
            'data': [
                {
                    'id': q.pk,
                    'category': str(q.category),
                    'name': q.name,
                    'params': q.params,
                }
                for q in cls.objects.all()
            ]
        }

    @api.classmethod
    def clone(cls, id, data):
        old_query = cls.objects.get(pk=id)
        new_query = cls.objects.create()
        new_query.parent = old_query
        new_query.sql = old_query.sql
        new_query.category = old_query.category


class QueryAction(Action):
    category = models.ForeignKey(Category)
    query_type = models.ChoiceField(
        {
            'base': 'System Query',
            'user': 'User Query',
        }, default='user',
    )
    sql = models.TextField()
    params = models.TextField()
    context = models.TextField()
    domain = models.TextField()

    class Meta:
        name = 'ui.action.query'

    @api.method(request=True)
    def get_metadata(self, request: HttpRequest):
        cls = import_string(self.qualname)
        return cls.get_metadata(request)

    @api.classmethod
    def list_all(cls):
        return {
            'data': [
                {
                    'id': q.pk,
                    'category': str(q.category),
                    'name': q.name,
                    'params': q.params,
                }
                for q in cls.objects.all()
            ]
        }

    @api.method(request=True)
    def execute(self, request: HttpRequest, params=None):
        cls = import_string(self.qualname)
        inst = cls(request, params)
        return inst.execute()
