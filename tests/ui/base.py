from flask_testing import LiveServerTestCase
from selenium import webdriver
from orun.apps import Application
from orun.core.management.commands import migrate, upgrade, recreatedb


class TestServer(LiveServerTestCase):
    addons = ['base']
    fixtures = True

    def create_app(self):
        cfg = {
            'SECRET_KEY': '123456',
            # 'SQL_DEBUG': True,
            'DATABASES': {
                'default': {'ENGINE': 'sqlite:///db.sqlite3'},
            },
        }
        app = Application(__name__, addons=self.addons, settings=cfg)
        app.config['TESTING'] = True
        app.config['LIVESERVER_PORT'] = 0
        with app.app_context():
            # recreate db
            recreatedb.recreate()
            # prepare database
            migrate.migrate(None, None, True, 'default', False, False, True, verbosity=True)
            # load fixtures
            if self.fixtures:
                upgrade.upgrade(None, None)
        return app


class TestChrome(TestServer):
    def setUp(self) -> None:
        self.driver = webdriver.Chrome()
