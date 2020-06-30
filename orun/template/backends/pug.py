import re

from orun.conf import settings
from orun.template import TemplateDoesNotExist, TemplateSyntaxError
from orun.utils.functional import cached_property
from orun.utils.module_loading import import_string
from orun.utils.translation import gettext
from orun.template.engine import Engine

from .base import BaseEngine


class Pug(BaseEngine):

    app_dirname = 'templates'

    def __init__(self, params):
        options = params.copy()
        super().__init__(params)
        self.engine = Engine(self.dirs, self.app_dirs, **options)

    def from_string(self, template_code):
        return Template(self.engine.from_string(template_code), self)

    def get_template(self, template_name):
        try:
            return Template(self.engine.get_template(template_name), self)
        except TemplateDoesNotExist as exc:
            raise

    @cached_property
    def template_context_processors(self):
        return [import_string(path) for path in self.context_processors]


class Template:

    def __init__(self, template, backend):
        self.template = template
        self.backend = backend
        self.origin = Origin(
            name=template.filename, template_name=template.name,
        )

    def render(self, context=None, request=None):
        from .utils import csrf_input_lazy, csrf_token_lazy
        if context is None:
            context = {}
        if request is not None:
            context['request'] = request

            context['config'] = settings
            context['csrf_input'] = csrf_input_lazy(request)
            context['csrf_token'] = csrf_token_lazy(request)
            for context_processor in self.backend.template_context_processors:
                context.update(context_processor(request))
        return self.template.render(context)


from token import (LPAR, RPAR, NEWLINE, INDENT, DEDENT)

RE_TAG = re.compile(r'^(\w(?:[-:\w]*\w)?)')


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.input = source
        self.pos = -1

    def blank(self):
        pass

    def eos(self):
        pass

    def tag(self):
        if captures := RE_TAG.match(self.input)
            name = captures.groups(0)
            l = len(name)

    def indent(self):
        pass


def tokenize(text: str):
    indent = 0
    for line in text.splitlines():
        token = NEWLINE
        yield (NEWLINE, '\n')
        s = ''
        wl = 0
        for c in line:
            if token == NEWLINE:
                if c == ' ':
                    s += c
                else:
                    if wl > indent:
                        indent = wl
                        token = INDENT
                        yield (INDENT, s)
                    elif wl < indent:
                        token = DEDENT
                        yield (DEDENT, s)
                    else:
                        token = INDENT
                    s = ''
                continue
            if c == '(':
                pass
            wl += 1
