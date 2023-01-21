import os
import json
import datetime
import mimetypes

from lxml import etree
from jinja2 import Template
from reptile.bands import Report
import reptile

from orun.reports.data import default_connection
from orun.apps import apps
import orun.reports.filters
# from reptile.exports import pdf
# from orun import app


mimetypes.init()

reptile.EnvironmentSettings.env.finalize = orun.reports.filters.localize


class ReptileEngine:
    def auto_report(self, xml, *args, **kwargs):
        return self.from_xml(xml, *args, **kwargs)

    def create_report(self, xml, **kwargs):
        rep = reptile.Report(params=kwargs.get('params'))
        rep.from_string(xml)
        return rep

    def from_xml(self, xml, output_file, connection, **kwargs):
        report = self.create_report(xml, **kwargs)
        report.default_connection = connection
        doc = report.prepare()
        pdf.Export(doc).export(output_file)
        return os.path.basename(output_file)

    def extract_params(self, xml):
        doc = etree.fromstring(xml)
        return doc.find('.//params')

    def export(self, content: str, *args, **kwargs):
        from reptile.exports.pdf import PDF
        # rep_server = settings.REPORT_SERVER
        # if rep_server.startswith('http://'):
        #     rep_server = rep_server.split('//', 1)[1]
        fmt = 'pdf'
        # conn_str = self.make_conn_str(kwargs['connection'])
        filename = kwargs['output_file']
        name = kwargs['name']
        data = kwargs['params'].get('data')
        where = kwargs.get('where') or {}
        if data:
            params = {dt['name']: dt for dt in data}
            where.update({
                k: param.get('value1')
                for k, param in params.items()
            })
            for k, v in list(where.items()):
                param = params[k]
                op = param['op']
                if op == 'between':
                    where[f'{k}1'] = param.get('value1')
                    where[f'{k}2'] = param.get('value2')
                if isinstance(v, list):
                    tp = param['type']
                    if tp == 'SelectionField':
                        v = ','.join([f"""'{o.replace("'", "")}'""" for o in v])
                    else:
                        v = ','.join([str(o) for o in v])
                    where[k] = v
                elif v and param['type'] == 'DateField':
                    where[k] = datetime.datetime.strptime(v, '%Y-%m-%d').date()
        company = kwargs['company']
        vars = {}
        if company:
            if company.report_header:
                vars['report_header'] = "'%s'" % company.report_header.replace("'", "'''")
            if company.report_footer:
                vars['report_footer'] = "'%s'" % company.report_footer.replace("'", "'''")
            logo = company.documento
            if logo:
                vars['report_logo'] = logo
        from orun.contrib.erp.models import Company

        company = Company.objects.filter(active=True).first()
        if company:
            try:
                where['company_logo'] = company.image.read()
            except:
                where['company_logo'] = None

        data = {
            'format': fmt,
            'filename': filename,
            'variables': vars,
        }
        ext = '.' + fmt

        rep = Report(json.loads(content), default_connection=default_connection)
        rep.variables = where
        doc = rep.prepare()

        PDF(doc).export(filename)

        return os.path.basename(filename)
