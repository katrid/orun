from typing import List, Optional, Iterable, TYPE_CHECKING
from functools import partial
from itertools import groupby
from decimal import Decimal
import datetime
import sqlparse
from jinja2 import Template, Environment
from jinja2 import contextfunction
if TYPE_CHECKING:
    from .totals import Total

from .units import mm


class FormatSettings:
    numeric_format: str = '%.2f'
    date_format: str = None
    datetime_format: str = None


class ReportEngine:
    env = None

    @classmethod
    def create_template_env(cls):
        if cls.env:
            return cls.env
        env = Environment(finalize=finalize)
        env.globals['str'] = str
        env.globals['sum'] = sum
        env.globals['total'] = total
        env.globals['avg'] = avg
        env.globals['count'] = len
        if cls.env is None:
            cls.env = env
        return env


class Report:
    title: str = None

    def __init__(self):
        self.pages: List['Page'] = []
        self.datasources: List['DataSource'] = []
        self.totals: List[Total] = []
        self.variables = {}
        # default database connection
        self.connection = None
        self._context = None

    def add_page(self, page: 'Page'):
        self.pages.append(page)
        if page.report != self:
            page.report = self

    def new_page(self) -> 'Page':
        return Page(self)

    def prepare(self):
        stream = []
        self._context = {
            'page_index': 0,
            'page_count': 0,
            'report': self,
        }
        for page in self.pages:
            page.prepare(stream)
        return {
            'pages': stream,
        }

    def get_datasource(self, name):
        for ds in self.datasources:
            if ds.name == name:
                return ds

    def from_string(self, s: str):
        self.read_xml(etree.fromstring(s))

    def load_file(self, filename: str):
        if filename.endswith('.xml'):
            with open(filename, 'rb') as f:
                self.from_string(f.read())

    def register_datasource(self, datasource):
        self.datasources[datasource.name] = datasource


class ReportObject:
    name: str = None
    _report: Report = None

    @property
    def report(self):
        return self._report

    @report.setter
    def report(self, value: Report):
        self.set_report(value)

    def set_report(self, value: Report):
        self._report = value


class Margin:
    left = 5 * mm
    top = 5 * mm
    right = 5 * mm
    bottom = 5 * mm


class Page(ReportObject):
    _x = _y = _ay = _ax = 0
    _page_header = None
    _page_footer = None
    _report: Report = None
    _context: dict = None
    width: float = 0
    height: float = 0
    title_before_header = True
    reset_page_number = False

    def __init__(self, report: Report = None):
        self.report = report
        self.bands: List['Band'] = []
        self.margin = Margin()

    def add_band(self, band: 'Band'):
        self.bands.append(band)
        if band.page != self:
            band.page = self

    def prepare(self, stream: List):
        self._context = self.report._context
        self._context['page_index'] += 1
        page = {'page_index': self._context['page_index']}
        bands = []
        for band in self.bands:
            # Only root bands must be prepared
            if band.parent is None:
                band.prepare(bands)
        page['bands'] = bands
        stream.append(page)

    def set_report(self, value: Report):
        if self._report and self in self._report.pages:
            self._report.pages.remove(self)
        self._report = value
        if value:
            value.add_page(self)


class DataSource(ReportObject):
    _data: Optional[Iterable] = None
    _opened = False
    connection = None

    def __init__(self, name: str, data: Iterable = None):
        self.name: str = name
        self._data = data

    def open(self):
        self._opened = True

    def close(self):
        self._data = None
        self._opened = False

    @property
    def data(self) -> Iterable:
        return self._data

    def set_report(self, value: Report):
        if self._report and self in self._report.pages:
            self._report.datasources.remove(self)
        self._report = value
        if value:
            value.datasources.append(self)


class Query(DataSource):
    sql: str = None
    params: dict = None
    _prepared = False
    _prepared_sql: str = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.params = {}
        self.prepared_params = []
        self._param_names: List[str] = []

    def prepare_params(self, params: dict):
        # find :params in sql query
        params = {}
        params.update(self.params)
        params.update(self.report.variables)
        marker = self.connection.param_marker or '%s'
        qs = sqlparse.parse(self.sql)
        for q in qs:
            for t in q.tokens:
                if sqlparse.sql.Where is t.__class__:
                    for p in t.tokens:
                        if p.__class__ is sqlparse.sql.Comparison:
                            pname = p.right.value[1:]
                            self._param_names.append(pname)
                            self.prepared_params.append(params.get(pname))
                            p.right.value = marker
            return str(q)

    def open(self):
        if self.connection is None:
            self.connection = self.report.connection
        params = {}
        params.update(self.params)
        params.update(self.report.variables)
        if self._prepared_sql:
            self.prepared_params = [params.get(pname) for pname in self._param_names]
        else:
            self._prepared_sql = self.prepare_params(params)
        self._data = self.connection.execute(self._prepared_sql, *self.prepared_params)
        super().open()


class Band:
    bg_color: int = None
    height: int = None
    _page: Page = None
    _parent: 'Band' = None
    _context: dict = None
    band_type = 'band'
    auto_height = False

    def __init__(self, page: Page = None):
        self.page = page
        self.objects: List['ReportElement'] = []
        self.children: List['Band'] = []

    def add_band(self, band: 'Band'):
        band.parent = self

    def add_element(self, element: 'ReportElement'):
        self.objects.append(element)
        if element.band != self:
            element.band = self

    def prepare(self, stream: List):
        objs = []
        self._context = self.page._context
        band = {'type': self.band_type, 'objects': objs}
        for obj in self.objects:
            obj.prepare(objs)
        stream.append(band)

    @property
    def page(self):
        return self._page

    @page.setter
    def page(self, value):
        if self._page is not None:
            self._page.bands.remove(self)
        self._page = value
        if value is not None:
            self._page.add_band(self)

    @property
    def parent(self) -> 'Band':
        return self._parent

    @parent.setter
    def parent(self, value: 'Band'):
        if self._parent is not None:
            self._parent.children.remove(self)
        self._parent = value
        if value is not None:
            self.page = value.page
            value.children.append(self)


class PageHeader(Band):
    band_type = 'page_header'


class PageFooter(Band):
    band_type = 'page_footer'


class HeaderBand(Band):
    band_type = 'header'


class ReportSummary(Band):
    pass


class DataBand(Band):
    band_type = 'data'
    _datasource: DataSource = None
    row_count: int = None
    group_header: 'GroupHeader' = None

    def prepare(self, stream: List):
        data = self.data
        self._context = self.page._context
        if data:
            self.process(data, stream)

    def process(self, data: Iterable, stream: List):
        self._context = self.page._context
        for i, row in enumerate(data):
            if self.datasource:
                self._context[self.datasource.name] = row
            self._context['line'] = i + 1
            super().prepare(stream)

    @property
    def data(self):
        if self.datasource:
            self.datasource.open()
            return self.datasource.data
        elif self.row_count:
            return range(self.row_count)

    @property
    def datasource(self):
        return self._datasource

    @datasource.setter
    def datasource(self, value: DataSource):
        if isinstance(value, str):
            # get datasource by the name
            value = self.page.report.get_datasource(value)
        self._datasource = value


class Group:
    def __init__(self, grouper, data: Iterable, index):
        self.grouper = grouper
        self.data: Iterable = data
        self.index: int = index


class GroupHeader(Band):
    band_type = 'group_header'
    condition: str = None
    band: DataBand = None
    _datasource: DataSource = None
    _condition = None

    def eval_condition(self, row, context: dict):
        context[self._datasource.name] = row
        if self._condition is None:
            self._condition = report_env.from_string(f'{{{{ {self.condition} }}}}')
        return self._condition.render(**context)

    def prepare(self, stream: List):
        self._context = self.page._context
        for child in self.children:
            if isinstance(child, DataBand):
                self._datasource = child.datasource
        self._datasource.open()
        data = self._datasource.data
        self.process(data, stream)

    def process(self, data: Iterable, stream: List):
        groups = groupby(data, key=partial(self.eval_condition, context=self._context))
        for i, (grouper, lst) in enumerate(groups):
            group = Group(grouper, lst, i)
            self._context['group'] = group
            super().prepare(stream)

            for child in self.children:
                if isinstance(child, (DataBand, GroupHeader)):
                    child.process(lst, stream)
                else:
                    child.prepare(stream)


class GroupFooter(Band):
    band_type = 'group_footer'
    group_header: GroupHeader = None


class ReportTitle(Band):
    pass


class PageTitle(Band):
    pass


class PreparedBand:
    def __init__(self, band: Band):
        self.band = band
        self._context = band._context


class Widget:
    _band: Band = None
    element_type: str = None
    name: str = None
    left: float = 0
    top: float = 0
    height: float = None
    width: float = None

    def __init__(self, band: Band = None):
        self.band = band

    def to_json(self) -> dict:
        return {
            'type': self.element_type,
            'left': self.left,
            'top': self.top,
            'height': self.height,
            'width': self.width,
        }

    def prepare(self, stream: List):
        self._context = self._band._context
        obj = self.to_json()
        if obj is not None:
            stream.append(obj)

    @property
    def band(self):
        return self._band

    @band.setter
    def band(self, value: Band):
        if self._band:
            self._band.children.remove(self)
        self._band = value
        if value:
            value.add_element(self)


class DisplayFormat:
    format: str = None
    kind: str = None


class Font:
    name: str = None
    size: int = None
    bold: bool = False
    italic: bool = False
    underline: bool = False
    color: int = None


class Border:
    left: bool = False
    top: bool = False
    right: bool = False
    bottom: bool = False
    width = 1
    color: int = None


class Text(Widget):
    _field: str = None
    _template = None
    bg_color: int = None
    auto_width = False
    can_grow = False
    can_shrink = False
    element_type = 'text'
    font: Font = None
    valign: str = None
    halign: str = None
    allow_tags: bool = False
    allow_expressions: bool = True
    datasource: DataSource = None
    text: Optional[str] = None

    def __init__(self, text: str = None, band: Band = None):
        super().__init__(band)
        self.display_format = DisplayFormat()
        self.font = Font()
        self.border = Border()
        self.text = text

    @property
    def field(self):
        return self._field

    @field.setter
    def field(self, value):
        self._field = value
        self.text = None

    def to_json(self) -> dict:
        if self.allow_expressions and self._template is None:
            if '<' in self.text:
                self.text = self.text.replace('{{', '').replace('}}', '')
            self._template = Template(self.text)
        new_obj = super().to_json()
        new_obj['allow_tags'] = self.allow_tags
        if self.allow_expressions:
            new_obj['text'] = self._template.render(**self.band._context)
        else:
            new_obj['text'] = self.text
        if self.font.name:
            new_obj['font_name'] = self.font.name
        if self.font.size:
            new_obj['font_size'] = self.font.size
        if self.font.bold:
            new_obj['font_bold'] = self.font.bold
        if self.font.italic:
            new_obj['font_italic'] = self.font.bold
        new_obj['valign'] = self.valign
        new_obj['halign'] = self.halign
        return new_obj


class SysText(Text):
    pass


class Image(ReportElement):
    element_type = 'image'
    filename: str = None
    url: str = None

    def to_json(self) -> dict:
        new_obj = super().to_json()
        new_obj['url'] = self.url
        return new_obj


REGISTRY = {
    'reporttitle': ReportTitle,
    'groupheader': GroupHeader,
    'groupfooter': GroupFooter,
    # 'data': Data,
    'query': Query,
    # 'params': Params,
    # 'param': Param,
    'text': Text,
    # 'div': Div,
    # 'calctext': CalcText,
    'summary': ReportSummary,
}
