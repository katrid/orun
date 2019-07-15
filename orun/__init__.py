from flask import (current_app as app, g, request, session, render_template, render_template_string)


SUPERUSER = 1

VERSION = (0, 0, 1, 'alpha', 0)

from orun.utils.version import get_version
from orun.apps import Application, AppConfig

__version__ = get_version(VERSION)
