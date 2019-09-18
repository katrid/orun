import inspect
from contextlib import contextmanager

import flask
import sqlalchemy as sa
from flask import Flask
from flask_mail import Mail
from jinja2 import Undefined
from sqlalchemy.engine.url import make_url
from sqlalchemy.schema import CreateSchema

from orun import g, SUPERUSER
from orun.auth.request import auth_before_request
from orun.conf import global_settings
from orun.db import (connection, DEFAULT_DB_ALIAS)
from orun.utils import translation
from orun.utils.functional import SimpleLazyObject
from orun.apps.registry import registry
from orun.apps.utils import adjust_dependencies


class SilentUndefined(Undefined):
    def _fail_with_undefined_error(self, *args, **kwargs):
        return ''


class Application(Flask):
    jinja_options = Flask.jinja_options.copy()
    jinja_options['undefined'] = SilentUndefined
    jinja_options['extensions'] = ['jinja2.ext.autoescape', 'jinja2.ext.with_', 'jinja2.ext.i18n']

    def __init__(self, import_name, addons=None, registry=registry, *args, **kwargs):
        registry.setup()
        settings = {}
        settings.update(global_settings.settings)
        settings.update(kwargs.pop('settings', {}))
        self.settings = settings

        super(Application, self).__init__(import_name, *args, **kwargs)
        self.models = {}
        self.ready = False
        self.addons = addons
        self.registry = registry
        self._pending_operations = []

        # Site user definition request handler
        self.before_request(auth_before_request)

        # Load connections
        from orun.db import ConnectionHandler
        self.connections = ConnectionHandler(self, self.settings['DATABASES'])

        self.config.update(self.settings)

        # register basic commands
        for cmd in registry.basic_commands:
            self.cli.add_command(cmd)

        # Init sqlalchemy metadata
        self.meta = sa.MetaData()

        if addons is None:
            addons = settings.get('INSTALLED_APPS', [])

        addons = adjust_dependencies(addons, registry)
        self.addons = {addon: registry[addon] for addon in addons}

        # always load web module
        self.addons['web'] = registry['web']

        self._report_env = None

        # register report engines
        if 'REPORT_ENGINES' in settings:
            from base.models.reports import REPORT_ENGINES
            REPORT_ENGINES.update(settings['REPORT_ENGINES'])

    def create_report_environment(self):
        # prepare jinja2 environment
        from orun.reports.engines.chrome.filters import localize, linebreaks, groupby
        from orun.reports.engines.chrome.extension import ReportExtension
        from orun.reports.engines.chrome.utils import avg, total, to_list
        from reptile import ReportEngine

        env = self.create_jinja_environment()
        ReportEngine.env = env
        env.autoescape = False
        env.add_extension(ReportExtension)
        env.finalize = localize
        env.filters['localize'] = localize
        env.filters['linebreaks'] = linebreaks
        env.globals['static_fs'] = self.static_fs
        env.filters['total'] = total
        env.globals['avg'] = avg
        env.globals['sum'] = sum
        env.globals['count'] = len
        # env.filters['groupby'] = groupby
        self._report_env = env

    @property
    def report_env(self):
        if self._report_env is None:
            self.create_report_environment()
        return self._report_env

    @property
    def connection(self):
        return self.connections[DEFAULT_DB_ALIAS]

    def setup(self):
        self.ready = True

        for app in self.addons.values():
            app.init_addon()

            # Build models
            for model_class in list(app.models.values()):
                if not model_class.Meta.abstract and not model_class.Meta.auto_created:
                    model_class.__build__(self)

            # Register blueprints
            self.register_blueprint(app)

            # Register addon commands
            for cmd in self.registry.module_commands[app.label]:
                self.cli.add_command(cmd)

            # Register addon views on app
            self._register_views(app)

        self.do_pending_operations()

        # Initialize app context models
        self.build_models()

        for addon in self.addons.values():
            # Initialize addon on current instance
            if addon.init_app is not None:
                addon.init_app(self)

    def build_models(self):
        print('Building models')
        for model in self.models.values():
            model._meta.build_table(self.meta)

        try:
            for model in list(self.models.values()):
                model._meta._build_mapper()
        except:
            print('Error building model', model._meta.name)
            raise

    def do_pending_operations(self):
        while self._pending_operations:
            self._pending_operations.pop(0)()

    def create_all(self):
        self.meta.create_all(self.db_engine)

    def load_fixtures(self):
        from orun.core.management.commands import loaddata
        for addon in self.addons:
            for fixture in addon.fixtures:
                loaddata.load_fixture(addon, fixture)

    def register_db(self, database):
        if database not in self.config['DATABASES']:
            def_db = self.config['DATABASES'][DEFAULT_DB_ALIAS]
            url = make_url(def_db['ENGINE'])
            url.database = database
            self.config['DATABASES'][database] = {
                'ENGINE': str(url)
            }

    def _register_models(self):
        from base.registry import register_model
        for model in self.models.values():
            register_model(model)

    def get_model(self, item):
        if inspect.isclass(item):
            item = item.Meta.name
        return self.models[item]

    def __getitem__(self, item):
        return g.env[item]
        if not isinstance(item, str):
            item = item.Meta.name
        return self.models[item]

    def __setitem__(self, key, value):
        self.models[key] = value

    def __contains__(self, item):
        if inspect.isclass(item):
            item = item._meta.name
        return item in self.models

    @property
    def db_engine(self):
        """
        Get the default database engine
        """
        return self.connections[DEFAULT_DB_ALIAS].engine

    @property
    def db_session(self):
        """
        Get the default database session
        """
        return connection.session

    def _register_views(self, addon):
        for view in registry.module_views[addon.schema]:
            view.register(self)

    def app_context(self, user_id=SUPERUSER, **kwargs):
        old_state = {}
        ctx = AppContext(self)
        try:
            old_state.update(flask.g.__dict__)
            ctx._old_lang = old_state['LANGUAGE_CODE']
        except:
            pass
        database = kwargs.pop('db', None)
        if database:
            self.register_db(database)
        ctx.g.DEFAULT_DB_ALIAS = database or self.config.get('DEFAULT_DB_ALIAS', DEFAULT_DB_ALIAS)
        for k, v in kwargs.items():
            setattr(ctx.g, k, v)
        ctx.g.LANGUAGE_CODE = kwargs.pop('LANGUAGE_CODE', old_state.get('LANGUAGE_CODE', self.config['LANGUAGE_CODE']))
        ctx.g.user_id = user_id
        ctx.g.user = SimpleLazyObject(lambda: self['auth.user'].objects.get(user_id))
        context = {
            'lang': ctx.g.LANGUAGE_CODE,
            'user_id': user_id,
        }
        ctx.g.env = Environment(user_id, context)
        ctx.g.context = context

        # Auto initialize application
        if not self.ready:
            with ctx:
                self.setup()

        return ctx

    def create_jinja_environment(self):
        rv = super(Application, self).create_jinja_environment()
        rv.install_gettext_callables(translation.gettext, translation.ngettext)
        return rv

    def iter_blueprints(self):
        return reversed(self._blueprint_order)

    def sudo(self, user_id=SUPERUSER):
        return self.with_context(user_id)

    @contextmanager
    def with_context(self, user_id=None, context=None):
        if user_id is None:
            user_id = SUPERUSER
        old_env = g.env
        new_env = g.env(user_id, context)
        g.env = new_env
        yield
        g.env = old_env

    def static_fs(self, url):
        _, _, addon, url = url.split('/', 3)
        fn = self.view_functions[f'{addon}.static']
        filename = fn(url).response.file.name
        return filename

    # TODO remove static_reverse
    static_reverse = static_fs


class AppContext(flask.app.AppContext):
    _old_lang = None

    def __enter__(self):
        super(AppContext, self).__enter__()
        # Apply new context language state
        if self.g.LANGUAGE_CODE:
            translation.activate(self.g.LANGUAGE_CODE)

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore the old context language state
        if self._old_lang:
            translation.activate(self._old_lang)
        super(AppContext, self).__exit__(exc_type, exc_val, exc_tb)


from orun.api import Environment
