import datetime
import jinja2
from lxml import etree

from orun import app
from orun.reports.pdf import ChromePDF


class HtmlEngine:
    env: jinja2.Environment = None
    default_connection = None

    def __init__(self):
        self.env = app.report_env

    def auto_report(self, xml, *args, **kwargs):
        return self.from_xml(xml, **kwargs)

    def from_xml(self, xml, output_file, connection, **kwargs):
        report = Report()
        # set default connection to report environment
        report.loads(xml)
        report.connections['default'] = connection
        context = kwargs
        templ = '\n'.join(report.prepare(context))
        kwargs.setdefault('date', datetime.datetime.now())
        params = kwargs.get('params')
        html = self.env.from_string(templ).render(**context)
        return ChromePDF.print_to_pdf(html, output_file)

    def extract_params(self, xml):
        xml = etree.fromstring(xml)
        params = xml.find('.//params')
        if params is not None:
            return params


class Report:
    title: str = None
    template = 'reports/report.jinja2'
    content: str = None
    document: str = None
    context = None

    def __init__(self):
        self.pages = []
        self.connections = {}
        self.datasources = {}
        self.params = {}
        self.prepared_params = {}
        self._page = None

    @property
    def connection(self):
        return self.connections['default']

    @property
    def datasource(self):
        return self.datasources['default']

    def load_file(self, filename):
        with open(filename, 'r', encoding='utf-8') as f:
            self.loads(f.read())

    def loads(self, content):
        self.content = content
        xml = etree.fromstring(self.content)
        tree = parse(content)
        assert len(tree) == 1
        # report should be the first element
        rep = tree[0]
        for p in rep:
            if isinstance(p, Page):
                break
        else:
            # auto create a page
            self._page = Page()
            self.pages.append(self._page)
        self.title = rep.attrs.get('title', self.title)
        self.template = rep.attrs.get('template', self.template)
        self._load_tree(rep)

    def _load_tree(self, parent):
        for node in parent:
            if isinstance(node, ReportObject):
                node.load(self)
            if isinstance(node, Band):
                if not isinstance(parent, Band):
                    # add the band into current page
                    self._page.stream.append(node)
            if isinstance(node, Element):
                self._load_tree(node)

    def prepare(self, context):
        self.context = context
        output = []
        context['report'] = self
        context['datasources'] = self.datasources
        context['connections'] = self.connections
        self.prepared_params = context.get('params')
        if self.template:
            output.append(f'{{% extends "{self.template}" %}}')
            output.append('{% block report %}')
        output.append('<div id="report">')
        for p in self.pages:
            p.compile(output, context)
        output.append('</div>')
        if self.template:
            output.append('{% endblock %}')
        self.document = output
        return output


class PreparedPage:
    def __init__(self):
        self.objects = []


class Environment:
    tags = {}
    default_template = None

    @classmethod
    def register_class(cls, *args):
        for arg in args:
            cls.tags[arg.tag] = arg


class Element:
    tag = None

    def __init__(self, tag=None, parent=None):
        self.tag = tag or self.tag
        self.parent = parent
        self.stream = []
        self.attrs = {}
        self.class_list = []

    def __bool__(self):
        return True

    def __len__(self):
        return len(self.stream)

    def __iter__(self):
        return iter(self.stream)

    def __repr__(self):
        return str(self)

    def __str__(self):
        return '%s%s%s' % self.render()

    def render_head(self, tag=None):
        tag = tag or self.tag
        attrs = ''
        if self.attrs:
            attrs = ' ' + ' '.join(['{}="{}"'.format(k, v[1:-1] if str(v).startswith('"') or str(v).startswith("'") else v) for k, v in self.attrs.items()])
        if self.class_list:
            attrs += ' class="%s"' % ' '.join(self.class_list)
        return f'''<{tag}{attrs}>'''

    def render_stream(self):
        return '\n'.join([str(child) for child in self.stream])

    def render_foot(self, tag=None):
        tag = tag or self.tag
        return f'''</{tag}>'''

    def render(self):
        return self.render_head(), self.render_stream(), self.render_foot()


class Component(Element):
    @property
    def name(self):
        return self.attrs.get('name')


class ReportObject(Component):
    report = None

    def load(self, report):
        self.report = report

    def compile(self, output, context):
        output.append(self.render_head())
        self.compile_children(output, context)
        output.append(self.render_foot())

    def compile_children(self, output, context):
        for child in self:
            if isinstance(child, ReportObject):
                child.compile(output, context)
            else:
                output.append(str(child))


class Param(ReportObject):
    tag = 'param'

    def load(self, report):
        super().load(report)
        if isinstance(self.parent, Query):
            self.parent.params[self.name] = self
        else:
            report.params[self.name] = self

    def compile(self, output, context):
        pass

    def default_value(self):
        if 'default-value' in self.attrs:
            return eval(self.attrs['default-value'], globals, self.report.context)


class Page(ReportObject):
    tag = 'page'

    def load(self, report: Report):
        super().load(report)
        report._page = self
        report.pages.append(self)


class Widget(ReportObject):
    pass


class Band(Widget):
    tag = 'band'
    header: 'Header' = None
    footer: 'Footer' = None
    classes = 'row band'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.classes += ' ' + self.tag

    def compile(self, output, context):
        classes = self.classes
        output.append(f'''<div class="{classes} {' '.join(self.class_list)}">''')
        bands = (child for child in self.stream if isinstance(child, Band))
        for child in self.stream:
            if child not in bands:
                if isinstance(child, ReportObject):
                    child.compile(output, context)
                else:
                    output.append(str(child))
        output.append('</div>')


class DataBand(Band):
    tag = 'data-band'
    group = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.attrs['datasource'] = 'default'

    @property
    def datasource(self):
        return self.report.datasources[self.attrs['datasource']]

    def compile(self, output, context):
        if self.group is None:
            self.compile_band(output, context)
        else:
            self.group.compile(output, context)

    def compile_band(self, output, context):
        if self.header is not None:
            self.header.classes = 'row band column-header'
            self.header.compile(output, context)
        if self.group is None:
            output.append(f'''{{% with records = datasources['{self.attrs['datasource']}'].data %}}''')
            output.append(f'''{{% for record in records %}}''')
        else:
            output.append(f'''{{% with records = group.list %}}''')
            output.append(f'''{{% for record in records %}}''')
        super().compile(output, context)
        output.append('{% endfor %}')
        if self.footer:
            self.footer.compile(output, context)
        output.append('{% endwith %}')


class Grid(DataBand):
    tag = 'grid'

    def compile_band(self, output, context):
        if self.header is None:
            # auto create header
            self.header = Header()
            for child in self.stream:
                if isinstance(child, Field):
                    field = Field(parent=self.header)
                    field.assign(child)
                    field.stream.append(child.caption)
                    self.header.stream.append(field)
        totals = any(field for field in self.stream if isinstance(field, Field) and field.total)
        if self.footer is None and totals:
            self.footer = Footer()
            for child in self.stream:
                if isinstance(child, Field):
                    field = Field(parent=self.footer)
                    total = child.total
                    name = child.name
                    field.assign(child)
                    if total and name:
                        if total == 'sum':
                            field.stream.append('{{ records|total("%s")|localize }}' % name)
                        elif total == 'avg':
                            field.stream.append('{{ records|avg("%s")|localize }}' % name)
                        else:
                            field.stream.append('&nbsp;')
                    else:
                        field.stream.append('&nbsp;')
                    self.footer.stream.append(field)
        super().compile_band(output, context)


class Group(Band):
    tag = 'group'
    expression: str = None
    group = None
    sub_group = None
    band = None

    sub_groups = None

    def load(self, report):
        super().load(report)
        if isinstance(self.parent, DataBand):
            self.parent.group = self
            self.band = self.parent
        elif isinstance(self.parent, Group):
            self.parent.sub_group = self
            self.group = self.parent
            self.band = self.parent.band

    def compile(self, output, context):
        if self.parent is self.band:
            # first group
            output.append(f'''{{% for group in datasources['{self.band.attrs['datasource']}'].data|groupby('{self.field}') %}}''')
        else:
            output.append(f'''{{% for group in group.list|groupby('{self.field}') %}}''')
        if self.header:
            self.header.classes = 'row band group-header'
            self.header.compile(output, context)
        else:
            if not self.has_text:
                # auto append text header
                self.stream.append('''{{ group.grouper }}''')
            super().compile(output, context)
        if self.sub_group:
            self.sub_group.compile(output, context)
            self.sub_group.compile_footer(output, context)
        else:
            self.band.compile_band(output, context)
        self.compile_footer(output, context)

    def compile_footer(self, output, context):
        if self.footer:
            self.footer.classes = 'row band group-footer'
            self.footer.compile(output, context)
        output.append('{% endfor %}')

    @property
    def field(self):
        return self.attrs['field']

    @property
    def has_text(self):
        for child in self.stream:
            if isinstance(child, str) and child:
                return child


class Header(Band):
    tag = 'header'

    def load(self, report):
        if isinstance(self.parent, (DataBand, Group)):
            self.parent.header = self


class Footer(Band):
    tag = 'footer'

    def load(self, report):
        if isinstance(self.parent, (DataBand, Group)):
            self.parent.footer = self


class GroupFooter(Footer):
    pass


class Connection(ReportObject):
    tag = 'connection'

    def load(self, report: Report):
        if 'name' not in self.attrs:
            self.attrs['name'] = 'default'
        report.connections[self.name] = self


class DataSource(ReportObject):
    tag = 'datasource'

    def load(self, report):
        super().load(report)
        if 'name' not in self.attrs:
            self.attrs['name'] = 'default'
        report.datasources[self.name] = self


class Query(DataSource):
    tag = 'query'
    sql: str = None

    def __init__(self, *args, **kwargs):
        self.params = {}
        super().__init__(*args, **kwargs)
        self.attrs.setdefault('connection', 'default')

    def load(self, report):
        super().load(report)
        if 'sql' in self.attrs:
            self.sql = self.attrs['sql']
        else:
            self.sql = '\n'.join([child for child in self.stream if isinstance(child, str)])

    @property
    def connection(self):
        return self.report.connections[self.attrs['connection']]

    def compile(self, output, context):
        pass

    @property
    def data(self):
        # collect params
        params = {
            k: v.default_value()
            for k, v in self.report.params.items()
        }
        for k, v in self.params.items():
            params[k] = v.default_value()
        if self.report.prepared_params:
            for k, v in self.report.prepared_params.items():
                params[k] = v
        # get data
        return list(self.connection.execute(self.sql, params))


class Field(ReportObject):
    tag = 'field'
    format = None

    def load(self, report):
        super().load(report)
        cols = self.attrs['cols'] = self.cols
        if not self.class_list:
            self.class_list = []
        self.class_list.append('field')
        if cols is None:
            tp = self.attrs.get('type')
            if 'col' not in self.class_list:
                self.class_list.append('col')
            if tp and tp not in self.class_list:
                self.class_list.append(tp)
        if 'format' in self.attrs:
            self.format = self.attrs['format']

    @property
    def caption(self):
        return self.attrs.get('caption', self.name)

    @property
    def cols(self):
        return self.attrs.get('cols', None)

    def compile(self, output, context):
        class_list = ' '.join(self.class_list)
        output.append('<div class="%s">' % class_list)
        fmt = self.format
        if fmt is None:
            fmt = self.attrs.get('type')
        if self.stream:
            self.compile_children(output, context)
        elif self.name:
            if fmt:
                fmt = '|localize("%s")' % fmt
            else:
                fmt = ''
            output.append('{{ record["' + self.name + '"]' + fmt + ' }}')
        output.append('</div>')

    @property
    def total(self):
        return self.attrs.get('total')

    def assign(self, field):
        self.class_list = list(field.class_list)
        self.attrs['type'] = field.attrs.get('type')
        self.attrs['cols'] = field.cols


def parse(xml):
    if isinstance(xml, str):
        xml = etree.fromstring(xml)

    def parse_item(node, parent=None):
        tag = Environment.tags.get(node.tag, Element)
        obj = tag(node.tag, parent)
        if parent:
            parent.stream.append(obj)
        for k, v in node.attrib.items():
            obj.attrs[k] = v
        for child in node:
            parse_item(child, obj)
        if node.text:
            obj.stream.append(node.text)
        return obj

    return [parse_item(xml)]


Environment.register_class(
    Param, Band, DataBand, Grid, Group, Header, Footer,
    Field,
    Connection, DataSource, Query,
)
