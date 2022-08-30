from typing import Optional
import warnings
import json
import os
import uuid
from collections import defaultdict
from jinja2 import Environment

from orun import api
from orun.http import HttpRequest
from orun.apps import apps
from orun.conf import settings
from orun.db import models, connection
from orun.reports.engines import get_engine, ConnectionProxy
from orun.template import loader
from orun.utils.translation import gettext_lazy as _
from orun.utils.module_loading import import_string
from .action import Action


class ReportCategory(models.Model):
    name = models.CharField(128, translate=True)

    class Meta:
        name = 'ui.action.report.category'


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
                    templ = loader.find_template(self.view.template_name)
                    if templ:
                        with open(templ, 'r', encoding='utf-8') as f:
                            params = engine.extract_params(f.read())
                        if params is not None:
                            print(params.tostring())
                            data['content'] = params.tostring()
            elif xml is not None:
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
                        xml = etree.fromstring(xml)
                # xml = self.view.get_xml(model)
                if model:
                    data['fields'] = model.get_fields_info(xml=xml)
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

    def _export_report(self, format='pdf', params=None, where=None):
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
            if rep_type == 'xml':
                with open(loader.get_template(report_file).template.filename, 'rb') as f:
                    xml = f.read()
            rep_type = report_file.rsplit('.', 1)[1]

        engine = get_engine(REPORT_ENGINES[rep_type])
        fname = uuid.uuid4().hex + '.pdf'
        output_path = os.path.join(settings.REPORT_PATH, fname)
        rep = engine.export(
            xml,
            connection=ConnectionProxy(connection),
            # company=g.user.user_company,
            name=self.name,
            template='admin/reports/base.jinja2',
            company=apps['auth.user'].objects.get(pk=1).user_company,
            format=format, model=model, query=qs, report_title=self.name, params=params, where=where,
            output_file=output_path,
        )
        if not isinstance(rep, (dict, str)):
            return rep
        if rep:
            if not isinstance(rep, str):
                rep = rep.export(format=format)
            out_file = '/web/reports/' + os.path.basename(rep)
            print('outfile', out_file)
            return {
                'open': out_file,
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
    def export_report(cls, id, format='pdf', params=None, where=None):
        # TODO check permission
        if isinstance(id, list):
            id = id[0]
        if isinstance(id, models.Model):
            rep = id
        else:
            rep = cls.objects.get(pk=id)
        if params:
            where = params.pop('where', None)
        return rep._export_report(format=format, params=params, where=where)

    @api.classmethod
    def on_execute_action(cls, action_id, context):
        fmt = context.pop('format', 'pdf')
        params = context.pop('params', None)
        if params is None:
            if 'active_id' in context:
                params = {
                    'where': {'pk': context['active_id']},
                }
        return cls.export_report(action_id, fmt, params)

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
                    'name': q.name + ' (User Report)' if q.owner_type == 'user' else q.name,
                    # 'params': q.params,
                }
                for q in cls.objects.filter(report_type='grid')
            ]
        }

    @api.method(request=True)
    def execute(self, request: HttpRequest, params=None):
        cls = import_string(self.qualname)
        inst = cls(request, params)
        return inst.execute()


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
