import datetime
import jinja2

from orun.template.backends.pug import Parser
from .html import HtmlEngine, Report


class PugEngine(HtmlEngine):
    def export(self, report, *args, **kwargs):
        return super().export(Parser.from_string(report), *args, **kwargs)
