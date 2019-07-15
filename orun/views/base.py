import json
from functools import wraps
from flask import request
from flask.json import jsonify
from flask_classy import FlaskView, route

from orun.apps import apps


REDIRECT_FIELD_NAME = None


class ViewType(type):
    def __init__(cls, name, bases, attrs):
        super(ViewType, cls).__init__(name, bases, attrs)

        # Register as module view
        mod_name = cls.__module__.split('.')[0]
        if mod_name != 'orun':
            apps.module_views[mod_name].append(cls)


class BaseView(FlaskView, metaclass=ViewType):
    pass


def json_route(path, *args, **kwargs):
    def decorated(fn):
        @wraps(fn)
        def new_fn(*args, **kwargs):
            data = request.json
            args += tuple(data.get('args', ()))
            return jsonify(fn(*args, **data.get('kwargs', {})))
        return route(path, *args, **kwargs)(new_fn)
    return decorated
