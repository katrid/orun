import warnings

from orun import template
from orun.templatetags.static import (
    do_static as _do_static, static as _static,
)
from orun.utils.deprecation import RemovedInOrun30Warning

register = template.Library()


def static(path):
    warnings.warn(
        'orun.contrib.staticfiles.templatetags.static() is deprecated in '
        'favor of orun.templatetags.static.static().',
        RemovedInOrun30Warning,
        stacklevel=2,
    )
    return _static(path)


@register.tag('static')
def do_static(parser, token):
    warnings.warn(
        '{% load staticfiles %} is deprecated in favor of {% load static %}.',
        RemovedInOrun30Warning,
    )
    return _do_static(parser, token)
