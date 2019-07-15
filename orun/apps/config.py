import os
import glob
from importlib import import_module

import flask

from .registry import apps


class AppConfig(flask.Blueprint):
    name = None
    description = None
    short_description = None
    dependencies = ['base']
    version = None
    fixtures = []
    demo = []
    author = None
    auto_install = False
    installable = True
    schema = None
    db_schema = None
    create_schema = None
    models_module = None
    js_templates = None
    locale_path = None
    init_app = None

    def __init__(self, schema=None, app_module=None, registry=None, *args, **kwargs):
        self.models = {}
        kwargs.setdefault('template_folder', 'templates')
        kwargs.setdefault('static_folder', 'static')
        mod_name = app_module or self.__class__.__module__.split('.')[-1]
        if self.schema is None:
            self.schema = schema or mod_name
        kwargs.setdefault('static_url_path', '/static/' + self.schema)
        self.name = self.schema
        self.is_ready = False
        self.module = app_module
        if not args:
            args = [self.name, mod_name]
        self.registry = registry or apps

        super(AppConfig, self).__init__(*args, **kwargs)

        if self.locale_path is None:
            self.locale_path = os.path.join(self.root_path, 'locale')

        if self.import_name == 'base':
            self.dependencies = []
        if self.registry:
            self.registry.app_configs[self.label] = self

    @property
    def app_label(self):
        return self.schema

    @property
    def label(self):
        return self.schema

    @label.setter
    def label(self, value):
        self.schema = value

    def init_addon(self):
        print('Loading module', self.name)
        with apps._lock:
            if not self.is_ready:
                self.is_ready = True

                # Load models
                try:
                    self.models_module = import_module('%s.models' % self.schema)
                except ImportError as e:
                    pass

                # Register views
                try:
                    import_module('%s.views' % self.schema)
                except ImportError:
                    if self.schema == 'web':
                        raise

                # Register addon commands
                for mod_name in apps.find_commands(os.path.join(self.root_path, 'management')):
                    try:
                        mod = import_module('%s.management.commands.%s' % (self.schema, mod_name))
                        apps.module_commands[self.schema].append(mod.command)
                    except ImportError:
                        pass
                self.ready()

    def ready(self):
        pass

    def get_models(self):
        return self.models.values()

    def get_js_templates(self):
        for templ in self.js_templates:
            if '*' in templ:
                for fname in glob.glob(templ):
                    with open(os.path.join(self.root_path, fname), 'rb') as f:
                        yield f.read()
            with open(os.path.join(self.root_path, templ), 'rb') as f:
                yield f.read()

    def __getitem__(self, item):
        return self.models[item]

    def __setitem__(self, key, value):
        self.models[key] = value

