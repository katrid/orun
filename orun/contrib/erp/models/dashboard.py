from orun import api, g
from orun.db import models
from orun.utils.translation import gettext_lazy as _


datatype_map = {
    'int': 'IntegerField',
    'date': 'DateField',
    'float': 'FloatField',
}


class Category(models.Model):
    name = models.CharField(label=_('Name'), translate=True)

    class Meta:
        title_field = 'name'
        name = 'ir.query.category'


class Query(models.Model):
    name = models.CharField(label=_('Name'), translate=True)
    category = models.ForeignKey(Category, null=False)
    sql = models.TextField(template={'form': 'view.form.sql-editor.jinja2'})
    context = models.TextField()
    params = models.TextField()
    public = models.BooleanField(default=False, label='External access', help_text='Has external/anonymous access')
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
                    name = 'param_%s' % (len(values.values()) + 1)
                    if lookup == 'icontains':
                        s = f'{field} like :{name}'
                        v = f'%{v}%'
                    else:
                        s = f'{field} = :{name}'
                    values[name] = v
                    sql.append('(%s)' % s)
            else:
                name = 'param_%s' % (len(values.values()) + 1)
                s = f'{field} = :{name}'
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

    def _prepare_context(self):
        ctx = {
            'request': request,
            'user_id': self.env.user_id,
            'user': self.env.user,
        }
        # evaluate query params
        return eval(self.context, ctx)

    @api.method
    def read(self, id, with_desc=False, as_dict=False, **kwargs):
        q = self.objects.get(id)
        params = q.context
        if params:
            params = q._prepare_context()
        else:
            params = {}

        sql = q.sql
        if 'params' in kwargs:
            # apply query search params
            sql = q._apply_search(sql, kwargs['params'], params)
            print(sql)

        if 'filter' in kwargs:
            params.update(kwargs['filter'])

        q = session.execute(sql, params)
        desc = q.cursor.description
        if with_desc:
            fields = [
                {'name': f[0], 'type': 'CharField', 'size': f[2]}
                for f in desc
            ]
        else:
            fields = [f[0] for f in desc]

        return {
            'fields': fields,
            'data': [dict(row) for row in q] if as_dict else [list(row) for row in q],
        }

    @api.method
    def all(self):
        return {
            'data': [
                {
                    'id': q.pk,
                    'category': str(q.category),
                    'name': q.name,
                    'params': q.params,
                }
                for q in self.objects.all()
            ]
        }

    @api.method
    def clone(self, id, data):
        old_query = self.objects.get(id)
        new_query = self.objects.create()
        new_query.parent = old_query
        new_query.sql = old_query.sql
        new_query.category = old_query.category

    @api.method
    def execute_sql(self, sql):
        cur = session.execute(sql)
        desc = cur.cursor.description
        return {
            'fields': [
                {'name': f[0], 'type': 'CharField', 'size': f[2]}
                for f in desc
            ],
            'data': [dict(row) for row in cur],
        }


class DashboardSettings(models.Model):
    """
    Dashboard settings.
    """
    dashboard = models.ForeignKey('ir.action.client')
    content = models.TextField(label='Content')

    class Meta:
        title_field = 'dashboard'
        name = 'ir.dashboard.settings'
