from typing import Optional, Iterable
import datetime
from decimal import Decimal
import warnings
import json
import os
import uuid
from collections import defaultdict
import mimetypes

from jinja2 import Template, Environment, pass_context

from orun import api
from orun.http import HttpRequest, HttpResponse
from orun.apps import apps
from orun.conf import settings
from orun.reports.runtime import PreparedReport
from orun.db import models, connection
from orun.template import loader
from orun.utils.translation import gettext_lazy as _
from orun.utils.module_loading import import_string
from orun.contrib.auth.models import Group
from .action import Action

try:
    from orun.reports.engines import get_engine, ConnectionProxy
    import reptile
except:
    pass


class ReportCategory(models.Model):
    name = models.CharField(128, translate=True)
    groups = models.OneToManyField('ui.action.report.category.groups')

    class Meta:
        name = 'ui.action.report.category'

    @api.classmethod
    def admin_get_groups(cls, category_id):
        groups = {g.pk: g.allow_by_default for g in Group.objects.only('pk', 'allow_by_default').filter(active=True)}
        groups.update({g.group_id: g.allow for g in ReportCategoryGroups.objects.only('group_id').filter(category_id=category_id)})
        return groups

    @api.classmethod
    def admin_set_groups(cls, category_id, groups: dict):
        ReportCategoryGroups.objects.filter(category_id=category_id).delete()
        ReportCategoryGroups.objects.bulk_create([
            ReportCategoryGroups(category_id=category_id, group_id=g, allow=v)
            for g, v in groups.items()
        ])
        return {
            'message': _('Permissions updated'),
        }


class ReportCategoryGroups(models.Model):
    category = models.ForeignKey(ReportCategory, null=False, on_delete=models.DB_CASCADE)
    group = models.ForeignKey('auth.group', null=False, on_update=models.DB_CASCADE)
    allow = models.BooleanField(default=True)

    class Meta:
        name = 'ui.action.report.category.groups'


class ReportAction(Action):
    category = models.ForeignKey(ReportCategory)
    owner_type = models.ChoiceField({'base': 'System Report', 'user': 'User Report'}, default='user')
    report_type = models.ChoiceField(
        {
            'query': 'User Query',
            'grid': 'Grid',
            'document': 'Document',
            'spreadsheet': 'Spreadsheet',
            'md': 'Markdown',
            'rst': 'reStructuredText',
            'js': 'Javascript',
            'paginated': 'Paginated (deprecated)',
            'banded': 'Banded',
            'office': 'Office Template',
            'jinja2': 'Jinja2 Template',
        }, null=False, verbose_name=_('Report Type'), default='query'
    )
    model: Optional[str] = models.CharField(128)
    view = models.ForeignKey('ui.view')
    sql: Optional[str] = models.TextField()
    template: Optional[str] = models.TextField()

    # published = models.ChoiceField({'private': 'Private', 'public': 'Public'})

    class Meta:
        name = 'ui.action.report'

    def to_dict(self, *args, **kwargs):
        from lxml import etree
        data = super(ReportAction, self).to_dict(*args, **kwargs)
        model = None
        if self.model:
            model = apps[self.model]

        rep_type = None
        xml = None
        template_name: str = self.view and self.view.template_name
        if not template_name and self.qualname:
            try:
                rep_class = import_string(self.qualname)
                if rep_class:
                    template_name = rep_class.template_name
            except:
                warnings.warn('Report class not found ' + str(self.pk))
        if template_name:
            rep_type = template_name.rsplit('.', 1)[1]
            if rep_type in REPORT_ENGINES:
                engine = get_engine(REPORT_ENGINES[rep_type])
                if rep_type == 'jinja2':
                    templ = loader.get_template(self.view.template_name)
                    params = templ.blocks.get('params')
                    if params:
                        ctx = templ.new_context({})
                        doc = ''.join(params(ctx))
                        if not model:
                            xml = etree.fromstring(doc)
                            model_name = xml.attrib.get('model')
                            if model_name:
                                model = apps[model_name]
                                data['fields'] = model.get_fields_info(xml)
                        data['content'] = doc
                elif rep_type == 'pug':
                    if self.view:
                        templ = loader.find_template(self.view.template_name)
                        if templ:
                            with open(templ, 'r', encoding='utf-8') as f:
                                params = engine.extract_params(f.read())
                            if params is not None:
                                data['content'] = params.tostring()
                elif xml is None:
                    if rep_type == 'xml' or rep_type == 'json':
                        templ = loader.find_template(template_name)
                        if templ:
                            with open(templ, 'r', encoding='utf-8') as f:
                                xml = f.read()
                    else:
                        xml = self.view._get_content({})
                    if isinstance(xml, str):
                        if rep_type == 'json':
                            xml = json.loads(xml)
                            data['content'] = xml['report'].get('params') or '<params/>'
                            data['action_type'] = 'ui.action.report'
                            return data
                        else:
                            try:
                                xml = etree.fromstring(xml)
                            except:
                                pass
                    # xml = self.view.get_xml(model)
                    if model:
                        data['fields'] = model.get_fields_info(xml=xml)
                    if xml and not isinstance(xml, str):
                        params = xml.find('params')
                        if params is not None:
                            if xml.tag == 'report' and 'model' in xml.attrib:
                                params.attrib['model'] = xml.attrib['model']
                                if not model:
                                    model = apps[xml.attrib['model']]
                                    data['fields'] = model.get_fields_info(params)

                                # model = app[model]
                                # for field in params:
                                #     if field.tag == 'field' and 'name' in field.attrib:
                                #         fld = model._meta.fields[field.attrib['name']]
                            xml = params
                            data['content'] = etree.tostring(xml, encoding='utf-8').decode('utf-8')
        if 'content' not in data:
            data['content'] = '<params/>'
        return data

    def _export_report(self, format='pdf', params=None, where=None, binding_params=None, bytes: bool = False):
        qs = model = None
        if self.model:
            model = apps[self.model]
            qs = model.objects.all()
        _params = defaultdict(list)

        rep_type = None
        template_name: str = self.view and self.view.template_name
        if not template_name and self.qualname:
            rep_class = import_string(self.qualname)
            template_name = rep_class.template_name
        if template_name:
            rep_type = template_name.rsplit('.', 1)[1]

        if rep_type == 'pug':
            xml = self.view.to_string()
        elif rep_type == 'rep':
            xml = self.view.get_xml(model)
            report_file = xml.attrib['file']
            with open(loader.get_template(report_file).template.filename, 'rb') as f:
                xml = f.read()
        elif rep_type == 'json':
            templ = loader.find_template(template_name)
            with open(templ, 'r', encoding='utf-8') as f:
                xml = json.loads(f.read())
        else:
            xml = self.view.get_xml(model)
            report_file = xml.attrib['file']
            if report_file.endswith('.json'):
                # new style report
                with open(loader.find_template(report_file)) as f:
                    xml = f.read()
            elif rep_type == 'xml':
                with open(loader.get_template(report_file).template.filename, 'rb') as f:
                    xml = f.read()
            rep_type = report_file.rsplit('.', 1)[1]

        engine = get_engine(REPORT_ENGINES[rep_type])
        fname = uuid.uuid4().hex + '.pdf'
        output_path = os.path.join(settings.REPORT_PATH, fname)
        if binding_params and 'company_id' in binding_params:
            company = apps['res.company'].objects.get(pk=binding_params['company_id'])
        else:
            # TODO get the current user company
            company = apps['auth.user'].objects.get(pk=1).user_company
        export_data = {
            'connection': ConnectionProxy(connection),
            'name': self.name,
            'template': "admin/reports/base.jinja2",
            'company': company,
            'format': format,
            'model': model,
            'query': qs,
            'report_title': self.name,
            'params': params,
            'where': where,
            'output_file': output_path,
        }
        if bytes:
            return engine.export_bytes(xml, **export_data)
        rep = engine.export(xml, **export_data)
        if isinstance(rep, PreparedReport):
            return {
                'invoke': {
                    'katrid.printHtml': rep.content,
                },
            }
        if not isinstance(rep, (dict, str)):
            return rep
        if rep:
            if not isinstance(rep, str):
                rep = rep.export(format=format)
            out_file = '/web/reports/' + os.path.basename(rep)
            print('outfile', out_file)
            return {
                '$open': out_file,
                'name': self.name,
            }

    @api.classmethod
    def auto_report(cls, model, params=None, title=None):
        model_class = apps[model]
        qs = model_class.objects.all()
        default_view = model_class._admin_select_template('auto_report')
        templ = default_view.render(context={'opts': model_class._meta})
        engine = get_engine(REPORT_ENGINES['pug'])
        fname = uuid.uuid4().hex + '.pdf'
        output_path = os.path.join(settings.REPORT_PATH, fname)
        rep = engine.export(
            templ,
            connection=ConnectionProxy(connection),
            # company=g.user.user_company,
            name=title or model,
            template='admin/reports/base.jinja2',
            company=apps['auth.user'].objects.get(pk=1).user_company,
            format=format, model=model_class, queryset=qs, report_title=title or model_class._meta.verbose_name_plural,
            params=params, where=None,
            output_file=output_path,
        )
        if not isinstance(rep, (dict, str)):
            return rep
        if rep:
            out_file = '/web/reports/' + os.path.basename(rep)
            return {
                'open': out_file,
                'name': model_class._meta.verbose_name_plural,
            }

    @api.classmethod
    def export_report(cls, id, format='pdf', params=None, where=None, binding_params=None, bytes: bool = False):
        # TODO check permission
        if isinstance(id, list):
            id = id[0]
        if isinstance(id, models.Model):
            rep = id
        else:
            rep = cls.objects.get(pk=id)
        if params:
            where = params.pop('where', None)
        return rep._export_report(format=format, params=params, where=where, binding_params=binding_params, bytes=bytes)

    @api.classmethod
    def on_execute_action(cls, action_id, context):
        fmt = context.pop('format', 'pdf')
        params = context.pop('params', None)
        binding_params = None
        if params is None:
            if 'active_id' in context:
                params = {
                    'where': {'pk': context['active_id']},
                }
        if context and 'bindingParams' in context:
            binding_params = context['bindingParams']
        return cls.export_report(action_id, fmt, params, binding_params=binding_params)

    @api.classmethod
    def get_metadata(cls, request: HttpRequest, id, dev_info=False):
        report = cls.objects.only('qualname', 'report_type').get(pk=id)
        if report.qualname:
            klass = import_string(cls.objects.only('qualname').get(pk=id).qualname)
            if dev_info:
                info = klass.get_dev_metadata(request)
                info['id'] = report.pk
                return info
            return klass.get_metadata(request)
        elif report.report_type == 'query':
            return report.get_query_info(dev_info)

    def get_query_info(self, dev_info=False):
        info = {
            'name': self.name,
            'params': None,
            'template': None,
            'type': 'query',
        }
        if dev_info:
            info['model'] = self.model
            info['sql'] = self.sql
        return info

    @api.classmethod
    def list_all(cls):
        return {
            'data': [
                {
                    'id': q.pk,
                    'category_id': q.category_id,
                    'category': str(q.category) if q.category else 'Uncategorized',
                    'name': q.name + ' (User Report)' if q.owner_type == 'user' else q.name,
                    # 'params': q.params,
                }
                # todo check permission
                for q in cls.objects.all()
            ]
        }

    @api.classmethod
    def execute(cls, request: HttpRequest, id, params=None):
        report = cls.objects.only('qualname', 'report_type').get(pk=id)
        if report.qualname:
            klass = import_string(report.qualname)
            inst = klass(request, params)
            kwparams = {}
            if isinstance(params, list):
                for p in params:
                    if 'value1' in p:
                        val = p['value1']
                        if p['type'] == 'DateField':
                            val = datetime.datetime.strptime(val, '%Y-%m-%d')
                        kwparams[p['name']] = val
            elif isinstance(params, dict):
                kwparams = params
            return inst.execute(**kwparams)
        elif report.report_type == 'query':
            return report._read(True)

    def __call__(self, request: HttpRequest, params: dict = None):
        if self.qualname:
            klass = import_string(self.qualname)
            inst = klass(request, params)
            return inst.execute(**params)

    @api.classmethod
    def read(cls, id, with_description=False, as_dict=False, fields=None, **kwargs):
        # TODO replace query
        from .query import Query
        return Query.read(id, with_description=with_description, as_dict=as_dict, fields=fields, **kwargs)

    def _read(self, with_description=False, fields=None, **kwargs):
        q = self
        params = {}

        if 'filter' in kwargs:
            params.update(kwargs['filter'])
        sql = Template(q.sql).render(**params)
        values = []
        if 'params' in kwargs:
            # apply query search params
            pass
        if (fields):
            sql = 'SELECT top 100 %s FROM (%s) as __q' % (', '.join(fields))

        cur = connection.cursor()
        cur.execute(sql, values)
        desc = cur.cursor.description
        if with_description:
            fields = [
                {'name': f[0], 'type': datatype_map.get(f[1], 'CharField'), 'size': f[2]}
                for f in desc
            ]
        else:
            fields = [f[0] for f in desc]

        return {
            'fields': fields,
            'data': [[float(col) if isinstance(col, Decimal) else col for col in row] for row in cur.fetchall()],
        }

    @api.classmethod
    def preview(cls, request: HttpRequest, content: str, params: dict = None):
        if request.user.is_superuser:
            params_values = {}
            if params:
                params_values = params['values']
            from reptile.bands import Report
            from orun.contrib.erp.models import Company
            from reptile.exports.pdf import PDF
            from orun.reports.data import default_connection
            rep = Report(json.loads(content), default_connection=default_connection)
            company = Company.objects.filter(active=True).first()
            if company and company.image:
                try:
                    params_values['company_logo'] = company.image.read()
                except:  # noqa
                    params_values['company_logo'] = None
            rep.variables = params_values
            doc = rep.prepare()
            fname = uuid.uuid4().hex + '.pdf'
            filename = os.path.join(settings.REPORT_PATH, fname)
            PDF(doc).export(filename)
            out_file = '/web/reports/' + os.path.basename(filename)
            return {
                '$open': out_file,
                'name': 'Preview',
            }

    @api.classmethod
    def exec_sql(cls, request: HttpRequest, sql: str, params: dict):
        """
        Execute a sql query statement directly on database
        :param request:
        :param sql:
        :param params:
        :return:
        """
        if request.user.is_superuser:
            cur = connection.cursor()
            cur.execute(sql)
            return {
                'fields': [
                    {
                        'name': f[0],
                        'dataType': datatype_map.get(f[1], 'str')
                    }
                    for f in cur.description
                ],
                'data': [list(r) for r in cur.fetchall()],
            }


datatype_map = {
    datetime.date: 'DateField',
    datetime.datetime: 'DateTimeField',
    str: 'CharField',
    Decimal: 'DecimalField',
    float: 'FloatField',
    int: 'IntegerField',
}


class UserReport(models.Model):
    report = models.ForeignKey(ReportAction)
    # company = models.ForeignKey('res.company')
    public = models.BooleanField(default=True)
    params = models.TextField()

    class Meta:
        name = 'usr.report'


class AutoReport(models.Model):
    name = models.CharField(128, null=False)
    model = models.ForeignKey('content.type', null=False)
    content = models.TextField()

    class Meta:
        name = 'ui.report.auto'


def create_report_environment():
    # prepare jinja2 environment
    from orun.reports.engines.chrome.filters import localize, linebreaks, groupby
    from orun.reports.engines.chrome.extension import ReportExtension
    from orun.reports.engines.chrome.utils import avg, total, to_list, COUNT, AVG, SUM
    env = Environment()
    env.autoescape = False
    env.add_extension(ReportExtension)
    env.finalize = localize
    # env.undefined = SilentUndefined
    env.filters['localize'] = localize
    env.filters['linebreaks'] = linebreaks
    # env.globals['static_fs'] = self.static_fs
    env.filters['total'] = total
    env.globals['avg'] = avg
    env.globals['sum'] = sum
    env.globals['count'] = len
    env.globals['COUNT'] = COUNT
    env.globals['SUM'] = SUM
    env.globals['AVG'] = AVG
    from orun.reports.data import DataSource
    env.globals['create_datasource'] = lambda sql: DataSource(sql)
    # env.filters['groupby'] = groupby
    # self._report_env = env


# report_env = create_report_environment()

REPORT_ENGINES = {
    'rep': 'orun.reports.engines.reptile.ReptileEngine',
}

if hasattr(settings, 'REPORT_ENGINES'):
    REPORT_ENGINES.update(settings.REPORT_ENGINES)


def Sum(data: Iterable, member: str = None):
    if member is None:
        return sum(data)
    else:
        return sum(data.values(member))


def COUNT(obj):
    return obj.get_count()


def SUM(expr, band=None, flag=None):
    return sum(expr)


def MAX(expr, band=None, flag=None):
    return max(expr)


def MIN(expr, band=None, flag=None):
    return min(expr)


def AVG(expr, band=None, flag=None):
    return sum(expr) / len(expr)


def avg(values):
    return sum(values) / len(values)


@pass_context
def total(context, op, field=None):
    if isinstance(op, str) and field is None:
        field = op
        op = sum
    records = context.parent['records']
    if records:
        rec = records[0]
        if isinstance(rec, dict):
            fn = lambda rec: rec[field] or 0
        else:
            fn = lambda rec: getattr(rec, field) or 0
        return op(list(map(fn, records)))
    return 0


try:
    report_env = reptile.EnvironmentSettings.env
    report_env.globals['str'] = str
    report_env.globals['sum'] = Sum
    # env.globals['total'] = total
    # env.globals['avg'] = avg
    report_env.globals['count'] = len
    # report_env.globals['MIN'] = min
    # report_env.globals['MAX'] = max
    report_env.globals['COUNT'] = COUNT
    report_env.globals['SUM'] = SUM
    report_env.globals['AVG'] = AVG
    report_env.globals['MAX'] = MAX
    report_env.globals['MIN'] = MIN
    report_env.globals['avg'] = avg
    report_env.globals['total'] = total
except:
    pass
