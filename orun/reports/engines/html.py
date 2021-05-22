import asyncio
import pathlib
import datetime
import jinja2
from lxml import etree
import reptile.engine
from reptile.html import HtmlReport, Grid, GridColumn
from reptile.chrome import print_to_pdf

import orun.reports.filters
from orun.reports.data import Query
from orun.db import models
from orun.template import loader
from orun.utils.encoding import force_str


def create_datasource(sql):
    q = Query()
    q.sql = sql
    return q

reptile.engine.report_env.finalize = orun.reports.filters.localize
reptile.engine.report_env.create_datasource = create_datasource


class HtmlEngine:
    loop = asyncio.new_event_loop()
    report_footer = '<table class=\"page-footer\" style=\"margin: 0 5mm 0 5mm;width:100%; font-size:6pt;\"><tr><td>{{ company.report_footer }}</td><td style="text-align: right;"><span class=\"pageNumber\"></span> / <span class=\"totalPages\"></td></tr></table>'

    def export(self, report, format='pdf', company=None, queryset=None, where=None, output_file=None, **kwargs):
        rep = Report(model=kwargs.get('model'))
        rep.title = kwargs.get('report_title')
        rep.from_node(report)
        rep.params = where
        doc = rep.prepare()
        templ = loader.get_template('admin/reports/base.jinja2')
        display_params = ''
        html = templ.render(context={
            'content': doc, 'report_title': rep.title, 'company': company, 'display_params': display_params,
        })
        html_file = output_file + '.html'
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
