import datetime
import decimal
from collections import defaultdict

from orun.apps import apps
from orun.db import connection


class Graph(dict):
    def __init__(self, data=None, layout=None):
        self['data'] = data
        default_layout = {
            'hovermode': 'x unified',
        }
        if layout:
            default_layout.update(layout)
        self['layout'] = default_layout


class Trace:
    pass


class Bar(dict):
    hovertemplate = '%{label} (%{y:,.2f})'
    texttemplate = '%{y:,.2f}'

    def __init__(self, x=None, y=None, name=None, barmode=None, textposition=None, hovertemplate=None, texttemplate=None):
        if x:
            self['x'] = x
        if y:
            self['y'] = y
        if name:
            self['name'] = name
        if barmode:
            self['barmode'] = barmode
        if textposition:
            self['textposition'] = textposition
        self['hovertemplate'] = hovertemplate or self.hovertemplate
        self['texttemplate'] = texttemplate or self.texttemplate
        self['type'] = 'bar'


class Dashboard:
    def params(self):
        return []

    def api_callback(self, prop, value, values):
        pass

    def api_load(self, **kwargs):
        model = kwargs.get('model')
        if model:
            cls = apps.models[model]
            return cls.admin_get_view_info(view_type=kwargs.get('view_type'))

    def api_search(self, **kwargs):
        model = kwargs.get('model')
        if model:
            cls = apps.models[model]
            return cls.api_search(where=kwargs.get('where'))
