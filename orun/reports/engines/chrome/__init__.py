import json
import os
import uuid
import datetime

from orun.db import connection, models
from orun.conf import settings
from orun.core.serializers.json import OrunJSONEncoder
from orun.utils.xml import etree
from . import filters
from .utils import avg, total, to_list


def print_to_pdf(html, pdf_file):
    from PyQt5.QtCore import QUrl
    from PyQt5 import QtGui, QtCore

    global qapp
    if qapp is None:
        qapp = QApplication(['--disable-gpu', '--disable-extension'])

    view = QWebEngineView()
    page = QWebEnginePage()
    view.setPage(page)

    def pdf_printed(*args, **kwargs):
        page.pdfPrintingFinished.disconnect()
        page.loadFinished.disconnect()
        qapp.quit()

    def page_loaded(*args, **kwargs):
        page.pdfPrintingFinished.connect(pdf_printed)
        page.printToPdf(
            pdf_file,
            QtGui.QPageLayout(
                QtGui.QPageSize(QtGui.QPageSize.A4), QtGui.QPageLayout.Portrait, QtCore.QMarginsF(25, 25, 25, 25)
            )
        )

    page.loadFinished.connect(page_loaded)

    if isinstance(html, bytes):
        html = html.decode('utf-8')
    view.setHtml(html, QUrl('file://'))
    qapp.exec_()
    return os.path.basename(pdf_file)


class BaseEngine:
    pass


class ChromeEngine(BaseEngine):
    env = None

    def __init__(self):
        self.token = uuid.uuid4().hex

    def auto_report(self, xml, **kwargs):
        return self.from_xml(xml, **kwargs)

    def from_file(self, file):
        with open(file) as f:
            self.from_xml(f.read())

    def prepare_data(self, xml, data, source, parent=None, children=None):
        children_fields = {}

        def prepare_nested(row):
            data = row.serialize(field_names)
            for child in children:
                if 'field' in child.attrib:
                    field_name = child.attrib['field']
                    if field_name not in children_fields:
                        name = child.attrib['name']
                        field = model._meta.fields[field_name]
                        fields = field.related_model.get_fields_info(field.related_model)
                        children_fields[name] = fields
                        for field in fields.values():
                            field = {k: str(v) for k, v in field.items() if v is not None and not k.startswith('_')}
                            print('field', field)
                            child.append(etree.Element(
                                'field',
                                **field
                            ))
                    data[child.attrib['field']] = [s.serialize() for s in getattr(row, field_name)]
            return data

        model = source.attrib.get('model')
        if model:
            model = app[model]

        if parent is None:
            if model is not None:
                fields = [f for f in model._meta.fields if f.concrete]
                field_names = [f.name for f in fields]
                rows = model.objects.all()[:10]
            result = [prepare_nested(row) for row in rows]
            source.text = json.dumps(result, cls=OrunJSONEncoder)
        else:
            pass

    def select(self, cmd, params):
        if isinstance(params, (list, tuple)):
            rows = app.connection.engine.execute(cmd, *params)
        else:
            rows = session.execute(cmd, params)
        return rows

    def _from_xml(self, xml, **kwargs):
        imports = [
            'import json',
            'import statistics',
            'from orun.reports.engines.chrome.filters import localize, linebreaks',
            'from orun.reports.engines.chrome.utils import avg, total, to_list',
        ]
        default_filters = ['localize']
        lookup = mako.lookup.TemplateLookup(
            default_filters=default_filters,
            imports=imports,
            directories=[os.path.join(os.path.dirname(__file__), 'templates')],
            input_encoding='utf-8',
        )
        prefix = '<%namespace name="engine" file="report.mako"/>\n'
        report = etree.fromstring(xml)
        templ = mako.template.Template(
            prefix + xml, lookup=lookup,
            default_filters=default_filters,
            imports=imports,
        )
        kwargs['report'] = Report(report)
        return templ.render(models=app, select=self.select, **kwargs).encode('utf-8')

    def from_xml(self, xml, **kwargs):
        xml = self._from_xml(xml, **kwargs)
        fname = uuid.uuid4().hex + '.html'
        file_path = os.path.join(settings.REPORT_PATH, fname)
        output_path = file_path + '.pdf'
        with open(file_path, 'wb') as tmp:
            tmp.write(xml)
            tmp.close()
            return print_to_pdf(xml, output_path)


def query(cmd, params):
    if isinstance(params, (list, tuple)):
        rows = app.connection.engine.execute(cmd, *params)
    else:
        txt = text(cmd)
        bind_params = txt._bindparams
        rows = session.execute(txt, {k: params.get(k) for k in bind_params.keys()})
    return list(rows)


class JinjaEngine:
    def auto_report(self, xml, *args, **kwargs):
        return self.from_xml(xml, **kwargs)

    def from_xml(self, xml, **kwargs):
        kwargs.setdefault('date', datetime.datetime.now())
        kwargs.setdefault('utils', ReportUtils())
        kwargs.setdefault('q', query)
        templ = app.report_env.from_string(xml)
        params = templ.blocks.get('params')
        if params:
            ctx = templ.new_context({})
            params = ''.join(params(ctx))
            s = etree.fromstring(params)
            model = kwargs.get('model')
            if model is None and 'model' in s.attrib:
                kwargs['model'] = app[s.attrib['model']]
        xml = templ.render(kwargs)
        fname = uuid.uuid4().hex + '.html'
        file_path = os.path.join(settings.REPORT_PATH, fname)
        output_path = file_path + '.pdf'
        return print_to_pdf(xml, output_path)


class Report:
    def __init__(self, xml):
        self.xml = xml
        self.title = xml.attrib.get('title')
        self.model_name = xml.attrib.get('model')
        self.model = None
        if self.model_name:
            self.model = app[self.model_name]


class Field:
    def __init__(self, model, xml):
        self.xml = xml
        self.model = model
        self.name = xml.attrib['name']
        self.field = model._meta.fields[self.name]
        self.caption = xml.attrib.get('caption', self.field.caption)
        self.total = xml.attrib.get('total', None)

    def th(self):
        css = ''
        if isinstance(self.field, (models.FloatField, models.IntegerField)):
            css = 'text-right'
        return f'<th class="{css}">{self.caption}</th>'

    def td(self, record):
        css = ''
        if isinstance(self.field, (models.FloatField, models.IntegerField)):
            css = 'text-right'
        return f'<td class="{css}">{filters.localize(getattr(record, self.name))}'

    def foot(self, records):
        if self.total:
            css = ''
            if isinstance(self.field, (models.FloatField, models.IntegerField)):
                css = 'text-right'
            v = ''
            if self.total == 'sum':
                v = filters.localize(total(records, self.name))
            elif self.total == 'avg':
                v = filters.localize(avg(records, self.name))
            return f'<th class="{css}">{filters.localize(v)}'
        return '<th></th>'


class Fields(list):
    def has_totals(self):
        for item in self:
            if item.total:
                return True


class ReportUtils:

    def get_fields(self, model, block, fields):
        r = Fields()
        xml = block.strip()
        if xml:
            xml = etree.fromstring(xml)
            for f in xml:
                r.append(Field(model, f))

        return r
