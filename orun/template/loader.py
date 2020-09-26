import os

from orun.core.exceptions import SuspiciousFileOperation
from orun.utils._os import safe_join
from . import engines
from .utils import get_app_template_dirs
from .exceptions import TemplateDoesNotExist


def find_template(template_name: str) -> str:
    """
    Load and return a template for the given name.

    return None if not found
    """
    dirs = get_app_template_dirs('templates')
    for template_dir in dirs:
        try:
            name = safe_join(template_dir, template_name)
        except SuspiciousFileOperation:
            # The joined path was located outside of this template_dir
            # (it might be inside another one, so this isn't fatal).
            continue
        if os.path.isfile(name):
            return name


def get_template(template_name, using=None):
    """
    Load and return a template for the given name.

    Raise TemplateDoesNotExist if no such template exists.
    """
    chain = []
    engines = _engine_list(using)
    for engine in engines:
        try:
            return engine.get_template(template_name)
        except TemplateDoesNotExist as e:
            chain.append(e)

    raise TemplateDoesNotExist(template_name, chain=chain)


def select_template(template_name_list, using=None):
    """
    Load and return a template for one of the given names.

    Try names in order and return the first template found.

    Raise TemplateDoesNotExist if no such template exists.
    """
    if isinstance(template_name_list, str):
        raise TypeError(
            'select_template() takes an iterable of template names but got a '
            'string: %r. Use get_template() if you want to load a single '
            'template by name.' % template_name_list
        )

    chain = []
    engines = _engine_list(using)
    for template_name in template_name_list:
        for engine in engines:
            try:
                return engine.get_template(template_name)
            except TemplateDoesNotExist as e:
                chain.append(e)

    if template_name_list:
        raise TemplateDoesNotExist(', '.join(template_name_list), chain=chain)
    else:
        raise TemplateDoesNotExist("No template names provided")


def render_to_string(template_name, context=None, request=None, using=None):
    """
    Load a template and render it with a context. Return a string.

    template_name may be a string or a list of strings.
    """
    if isinstance(template_name, (list, tuple)):
        template = select_template(template_name, using=using)
    else:
        template = get_template(template_name, using=using)
    return template.render(context, request)


def _engine_list(using=None):
    return engines.all() if using is None else [engines[using]]
