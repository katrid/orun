import sys
import os
import uuid
from collections import defaultdict

from orun import app, api
from orun.conf import settings
from orun.db import models, connection
from orun.reports.engines import get_engine, ConnectionProxy
from orun.utils.translation import gettext_lazy as _
from orun.utils.xml import etree
from .action import Action


class ReportAction(Action):
    report_type = models.CharField(32, null=False, verbose_name=_('Report Type'))
    model = models.CharField(128)
    view = models.ForeignKey('ui.view')

    class Meta:
        name = 'ir.action.report'

    def serialize(self, *args, **kwargs):
        data = super(ReportAction, self).serialize(*args, **kwargs)
        model = None
        if self.model:
            model = app[self.model]

        rep_type = None
        if self.view and self.view.template_name:
            rep_type = self.view.template_name.rsplit('.', 1)[1]
            engine = get_engine(REPORT_ENGINES[rep_type])
            if rep_type == 'jinja2':
                templ = app.report_env.get_template(self.view.template_name)
                params = templ.blocks.get('params')
                if params:
                    ctx = templ.new_context({})
                    doc = ''.join(params(ctx))
                    if not model:
                        xml = etree.fromstring(doc)
                        model_name = xml.attrib.get('model')
                        if model_name:
                            model = app[model_name]
                            data['fields'] = model.get_fields_info(xml)
                    data['content'] = doc
            elif rep_type == 'pug':
                templ = app.report_env.get_template(self.view.template_name)
                with open(templ.filename, 'r', encoding='utf-8') as f:
                    params = etree.tostring(engine.extract_params(f.read()))
                if params is not None:
                    data['content'] = params

        print('report type', rep_type)
        if rep_type != 'jinja2' and rep_type != 'pug':
            xml = self.view.get_xml(model)
            print(xml)
            if model:
                data['fields'] = model.get_fields_info(xml=xml)
            params = xml.find('params')
            if params is not None:
                if xml.tag == 'report' and 'model' in xml.attrib:
                    params.attrib['model'] = xml.attrib['model']
                    if not model:
                        model = app[xml.attrib['model']]
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

    def _export_report(self, format='pdf', params=None):
        qs = model = None
        if self.model:
            model = app[self.model]
            qs = model.objects.all()
        _params = defaultdict(list)
        if 'data' in params:
            for crit in params['data']:
                for k, v in crit.items():
                    if k.startswith('value'):
                        _params[crit['name']].append(v)

            where = {}
            for k, v in _params.items():
                if len(v) > 1:
                    for i, val in enumerate(v):
                        where[k + str(i + 1)] = val
                else:
                    val = v[0]
                    if val == '':
                        val = None
                    where[k] = val
        elif params:
            where = params

        rep_type = None
        if self.view and self.view.template_name:
            rep_type = self.view.template_name.rsplit('.', 1)[1]

        if rep_type == 'rep':
            xml = self.view.to_string()
        else:
            xml = self.view.get_xml(model)
            report_file = xml.attrib['file']
            rep_type = report_file.rsplit('.', 1)[1]

        engine = get_engine(REPORT_ENGINES[rep_type])
        fname = uuid.uuid4().hex + '.pdf'
        output_path = os.path.join(settings.REPORT_PATH, fname)
        rep = engine.auto_report(
            xml,
            connection=ConnectionProxy(connection),
            format=format, model=model, query=qs, report_title=self.name, params=where, output_file=output_path,
        )
        if rep:
            if not isinstance(rep, str):
                rep = rep.export(format=format)
            out_file = '/web/reports/' + os.path.basename(rep)
            return {
                'open': out_file,
                'name': self.name,
            }

    @api.method
    def export_report(cls, id, format='pdf', params=None):
        rep = cls.objects.get(id)
        return rep._export_report(format=format, params=params)


class UserReport(models.Model):
    report = models.ForeignKey(ReportAction)
    company = models.ForeignKey('res.company')
    public = models.BooleanField(default=True)
    params = models.TextField()

    class Meta:
        name = 'usr.report'


class AutoReport(models.Model):
    name = models.CharField(128, null=False)
    model = models.ForeignKey('ir.model', null=False)
    content = models.TextField()

    class Meta:
        name = 'ui.report.auto'


REPORT_ENGINES = {
    'html': 'orun.reports.engines.html.ChromeEngine',
    'mako': 'orun.reports.engines.chrome.ChromeEngine',
    'jinja2': 'orun.reports.engines.chrome.JinjaEngine',
    'pug': 'orun.reports.engines.pug.ChromeEngine',
    'rep': 'orun.reports.engines.reptile.ReptileEngine',
}
