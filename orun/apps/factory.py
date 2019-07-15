import copy
from threading import Lock
from http.cookies import SimpleCookie
from sqlalchemy.engine.url import make_url
from orun.apps import Application


class BaseDispatcher(object):
    application_class = Application
    database_map = None

    def __init__(self, settings=None, app=None):
        self.app = app
        self.instances = {}
        self.lock = Lock()
        self.base_settings = settings
        self.database_map = settings.pop('DATABASE_MAP', {})

    def create_app(self, instance_name):
        settings = self.create_settings(instance_name)
        return Application(instance_name.replace('.', '-'), settings=settings)

    def create_settings(self, instance_name):
        settings = copy.deepcopy(self.base_settings)
        url = make_url(settings['DATABASES']['default']['ENGINE'])
        if self.database_map:
            url.database = self.database_map[instance_name]
        print('CREATE SETTINGS', url.database)
        settings['DATABASES']['default']['ENGINE'] = str(url)
        return settings

    def get(self, instance_name):
        with self.lock:
            if instance_name not in self.instances:
                self.instances[instance_name] = self.create_app(instance_name)
            return self.instances[instance_name]


class CookieDispatcher(BaseDispatcher):
    def __call__(self, environ, start_response):
        path_info = environ['PATH_INFO']
        cookie = environ.get('HTTP_COOKIE')
        if cookie:
            parser = SimpleCookie()
            parser.load(cookie)
            db = parser.get('db')
            if db and not path_info.startswith('/web/db'):
                db = db.value
                app = self.get(db)
                with app.app_context():
                    return app(environ, start_response)
        return self.app(environ, start_response)


class SubdomainDispatcher(BaseDispatcher):
    def __call__(self, environ, start_response):
        app = self.get(environ['HTTP_HOST'])
        with app.app_context():
            return app(environ, start_response)
