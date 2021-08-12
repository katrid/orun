import datetime
import jinja2
from lxml import etree

from orun.template.backends.pug import Parser
from .html import HtmlEngine, Report


class PugEngine(HtmlEngine):
    def extract_params(self, template):
        return Parser.from_string(template).find('params')

    def export(self, report, *args, **kwargs):
        return super().export(Parser.from_string(report), *args, **kwargs)
