from enum import Enum
from lxml import etree
from sqlalchemy.sql import text

import jinja2
from orun.utils.translation import gettext
from orun import render_template
from orun.utils.functional import cached_property
from orun.conf import settings
from orun.utils.module_loading import import_string
from orun import app


def get_engine(engine=None):
    return ReportEngines.get_engine(engine)


class ConnectionProxy:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, sql, params, **kwargs):
        for k, v in params.items():
            if isinstance(v, list):
                v = ','.join(v)
                params[k] = v
        sql = jinja2.Template(sql, '/*', '*/').render(**params)
        sql = text(sql)
        for param in sql._bindparams:
            if param not in params:
                params[param] = None
        return self.connection.engine.execute(sql, params, **kwargs)

    def __getattr__(self, item):
        return getattr(self.connection, item)


class ReportEngines(object):
    default_engine = None
    engines = []

    @classmethod
    def get_engine(cls, engine=None):
        if engine is None:
            engine = settings.DEFAULT_REPORT_ENGINE
        if isinstance(engine, str):
            if '.' in engine:
                engine = import_string(engine)
        for e in cls.engines:
            if e.__class__ is engine:
                return e
        return cls.load_engine(engine)

    @classmethod
    def load_engine(cls, engine):
        if isinstance(engine, str):
            engine = import_string(engine)
        e = engine()
        cls.engines.append(e)
        return e


class ReportOrientation(Enum):
    PORTRAIT = 1
    LANDSCAPE = 2


class Report(object):
    data = None
    grouping = None
    sorting = None
    totals = None
    select_command = None
    selected_fields = None
    model = None
    report_title = None

    def __init__(self, xml, report_file=None, engine=None, orientation=ReportOrientation.PORTRAIT):
        self.engine = engine or ReportEngines.default_engine
        self.xml = xml
        self.template = report_file
        if report_file is None:
            self.template = xml.attrib.get(
                'file',
                self.engine.portrait_template
                if orientation == ReportOrientation.PORTRAIT
                else self.engine.landscape_template
            )

    def prepare(self):
        pass

    @cached_property
    def document(self):
        if self.template:
            templ = render_template(self.template)
            return etree.fromstring(templ)


class BaseEngine:
    pass


class ReportEngine(object):
    env = None
    report_class = Report
    portrait_template = None
    landscape_template = None

    def __init__(self, portrait_template=None, landscape_template=None):
        if portrait_template:
            self.portrait_template = portrait_template
        if landscape_template:
            self.landscape_template = landscape_template
        if ReportEngines.default_engine is None:
            ReportEngines.default_engine = self

    def auto_report(self, xml, model, query, **kwargs):
        if isinstance(xml, str):
            xml = etree.fromstring(xml)
        if 'file' in xml.attrib:
            return self.export(xml.attrib['file'], **kwargs)
        else:
            fields = []
            for field in xml.findall('./fields/field'):
                lbl = field.attrib.get('label')
                field_name = field.attrib['name']
                if lbl is None:
                    field.attrib['label'] = str(model._meta.fields_dict[field_name].label)
                fields.append(field_name)
            data_file = self.query_to_xml(query, fields=fields)
            if 'report_title' not in kwargs:
                kwargs['report_title'] = str(model._meta.verbose_name_plural)
            return self.load_xml(
                xml, model=model, fields=fields, query=str(query), data=data_file,
                **kwargs
            )

    def _format_field(self, instance, field):
        v = getattr(instance, field)
        if v is None:
            return ''
        if v is True:
            return gettext('Yes')
        if v is False:
            return gettext('No')
        return v

    def _load_xml(self, xml, rep):
        raise NotImplementedError

    def load_xml(self, xml, model=None, fields=None, query=None, data=None, report_title=None):
        if isinstance(xml, str):
            xml = etree.fromstring(xml)
        rep = self.report_class(xml, engine=self)
        rep.selected_fields = fields
        if query:
            rep.select_command = query
        if data:
            rep.data = data
        rep.model = model
        rep.report_title = report_title
        return self._load_xml(xml, rep)

    def export(self, report, format='pdf', params=None, **kwargs):
        raise NotImplementedError
