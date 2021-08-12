import os
import asyncio
import pathlib
import posixpath
import jinja2
from lxml import etree
import reptile.engine
from reptile.html import HtmlReport, Grid, GridColumn
from reptile.chrome import print_to_pdf

import orun.reports.filters
from orun.template import engines
from orun.reports.data import Query
from orun.db import models
from orun.template import loader
from orun.utils.encoding import force_str


def create_datasource(sql):
    q = Query()
    q.sql = sql
    return q


env = engines['jinja2']


def url_to_path(path):
    from orun.contrib.staticfiles import finders
    normalized_path = posixpath.normpath(path).lstrip('/')
    absolute_path = finders.find(normalized_path)
    if not absolute_path:
        if path.endswith('/') or path == '':
            raise Exception("Directory indexes are not allowed here.")
        raise Exception("'%s' could not be found" % path)
    return absolute_path


env.env.globals['static_path'] = url_to_path
reptile.engine.report_env.finalize = orun.reports.filters.localize
reptile.engine.report_env.create_datasource = create_datasource


class HtmlEngine:
    loop = asyncio.new_event_loop()
    report_footer = '<table class=\"page-footer\" style=\"margin: 0 5mm 0 5mm;width:100%; font-size:6pt;\"><tr><td>{{ company.report_footer }}</td><td style="text-align: right;"><span class=\"pageNumber\"></span> / <span class=\"totalPages\"></td></tr></table>'

    def export(self, report, format='pdf', company=None, queryset=None, where=None, output_file=None, params=None, **kwargs):
        rep = Report(model=kwargs.get('model'))
        rep.title = kwargs.get('report_title')
        if not where and params:
            where = {}
            data = params['data']
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
        rep.params = where
        rep.from_node(report)
        doc = rep.prepare()
        templ = loader.get_template(kwargs['template'])

        display_params = ''
        html = templ.render(context={
            'content': doc, 'report_title': rep.title, 'company': company, 'display_params': display_params,
        })
        html_file = output_file + '.html'
        print(html_file)
        with open(html_file, 'w') as f:
            f.write(html)
        self.to_pdf(
            html_file, output_file,
            report_footer=reptile.engine.report_env.from_string(self.report_footer).render(company=company),
        )
        return output_file

    def to_pdf(self, html_path, pdf_path, report_footer):
        with open(pdf_path, 'wb') as pdf:
            pdf.write(print_to_pdf(self.loop, pathlib.Path(html_path).as_uri(), report_footer=report_footer))
        return True


class Report(HtmlReport):
    def __init__(self, model=None, datasource=None):
        super().__init__()
        self.model = model
        self.datasource = datasource

    def default_datasource(self):
        if self.datasource is None:
            return self.model.objects.all()
        return self.datasource

    def create_column(self, node):
        col = super().create_column(node)
        if col.name and self.model:
            field = self.model._meta.fields[col.name]
            if 'class' not in node.attrib:
                if isinstance(field, (models.IntegerField, models.DecimalField, models.FloatField)):
                    col.css = 'text-right'
            if 'caption' not in node.attrib:
                col.caption = force_str(field.label)
            if col.css:
                col.css = col.css + ' ' + field.get_internal_type() if col.css else field.get_internal_type()
        return col
