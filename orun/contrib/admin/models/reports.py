import sys
import os
import uuid
from collections import defaultdict
from jinja2 import Environment

from orun import api
from orun.apps import apps
from orun.conf import settings
from orun.db import models, connection
from orun.reports.engines import get_engine, ConnectionProxy
from orun.template import loader
from orun.utils.translation import gettext_lazy as _
from orun.http import HttpResponse
from orun.utils.xml import etree
from .action import Action


class ReportAction(Action):
    report_type = models.CharField(32, null=False, verbose_name=_('Report Type'))
    model = models.CharField(128)
    view = models.ForeignKey('ui.view')

    class Meta:
        name = 'ui.action.report'

    def to_dict(self, *args, **kwargs):
        data = super(ReportAction, self).to_dict(*args, **kwargs)
        model = None
        if self.model:
            model = apps[self.model]

        rep_type = None
        if self.view and self.view.template_name:
            rep_type = self.view.template_name.rsplit('.', 1)[1]
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
                templ = get_template(self.view.template_name)
                with open(templ.filename, 'r', encoding='utf-8') as f:
                    params = etree.tostring(engine.extract_params(f.read()))
                if params is not None:
                    data['content'] = params

        if rep_type != 'jinja2' and rep_type != 'pug':
            from lxml import etree
            xml = etree.fromstring(self.view._get_content({}))
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
            else:
                data['content'] = '<params/>'
        return data

    def _export_report(self, format='pdf', params=None, where=None):
        qs = model = None
        if self.model:
            model = apps[self.model]
            qs = model.objects.all()
        _params = defaultdict(list)
        types = {}
        # if params and 'data' in params:
        #     for crit in params['data']:
        #         for k, v in crit.items():
        #             if k.startswith('value'):
        #                 if crit['op'] == 'in' and not isinstance(v, list):
        #                     v = v.split(',')
        #                 _params[crit['name']].append(v)
        #                 types[crit['name']] = crit['type']
        #             elif not isinstance(v, dict):
        #                 _params[k].append(v)
        #                 if isinstance(v, int):
        #                     types[k] = 'IntegerField'
        #                 elif isinstance(v, str):
        #                     types[k] = 'StringField'
        #
        #     where = {}
        #     for k, v in _params.items():
        #         if len(v) > 1:
        #             for i, val in enumerate(v):
        #                 nm = k + str(i + 1)
        #                 where[nm] = val
        #                 types[nm] = types[k]
        #         else:
        #             val = v[0]
        #             if val == '':
        #                 val = None
        #             where[k] = val

        rep_type = None
        if self.view and self.view.template_name:
            rep_type = self.view.template_name.rsplit('.', 1)[1]

        if rep_type == 'rep':
            xml = self.view.to_string()
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
        rep = engine.auto_report(
            xml,
            connection=ConnectionProxy(connection),
            # company=g.user.user_company,
            name=self.name,
            company=apps['auth.user'].objects.get(pk=1).user_company,
            format=format, model=model, query=qs, report_title=self.name, params=params, types=types,
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
    def export_report(cls, id, format='pdf', params=None):
        # TODO check permission
        if isinstance(id, list):
            id = id[0]
        if isinstance(id, models.Model):
            rep = id
        else:
            rep = cls.objects.get(pk=id)
        return rep._export_report(format=format, params=params)

    @api.classmethod
    def on_execute_action(cls, action_id, context):
        fmt = context.pop('format', 'pdf')
        params = context.pop('params', None)
        if params is None:
            if 'active_id' in context:
                params = {
                    'data': [{'pk': context['active_id']}],
                }
        print(params)
        return cls.export_report(action_id, fmt, params)


class UserReport(models.Model):
    report = models.ForeignKey(ReportAction)
    company = models.ForeignKey('res.company')
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
    # env.filters['groupby'] = groupby
    # self._report_env = env


# report_env = create_report_environment()


REPORT_ENGINES = {
    'rep': 'orun.reports.engines.reptile.ReptileEngine',
}

if hasattr(settings, 'REPORT_ENGINES'):
    REPORT_ENGINES.update(settings.REPORT_ENGINES)
