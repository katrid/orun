from enum import Enum

import jinja2
from orun.conf import settings
from orun.utils.module_loading import import_string


def get_engine(engine=None):
    return ReportEngines.get_engine(engine)


class ConnectionProxy:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, sql, params, **kwargs):
        for k, v in params.items():
            if isinstance(v, list):
                v = ','.join(v)
                params[k] = v
        sql = jinja2.Template(sql, '--', '!--').render(**params)
        for param in sql._bindparams:
            if param not in params:
                params[param] = None
        return self.connection.engine.execute(sql, params, **kwargs)

    def __getattr__(self, item):
        return getattr(self.connection, item)


class ReportEngines(object):
    default_engine = None
    engines = []

    @classmethod
    def get_engine(cls, engine=None):
        if engine is None:
            engine = settings.DEFAULT_REPORT_ENGINE
        if isinstance(engine, str):
            if '.' in engine:
                engine = import_string(engine)
        for e in cls.engines:
            if e.__class__ is engine:
                return e
        return cls.load_engine(engine)

    @classmethod
    def load_engine(cls, engine):
        if isinstance(engine, str):
            engine = import_string(engine)
        e = engine()
        cls.engines.append(e)
        return e


class ReportOrientation(Enum):
    PORTRAIT = 1
    LANDSCAPE = 2


class ReportEngine:
    def export(self, report, format='pdf', params=None, **kwargs):
        raise NotImplementedError
