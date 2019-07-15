from jinja2 import nodes
from jinja2.ext import Extension


class ReportExtension(Extension):
    tags = {'band'}

