import unittest
from sqlalchemy.engine.url import make_url
from orun import app
from orun.db import DEFAULT_DB_ALIAS
from orun.core.management.commands import recreatedb
from orun.core.management.commands import migrate
from orun.core.management.commands import upgrade


def _rename_database(db):
    url = make_url(db)
    url.database = 'test_' + url.database
    return str(url)


def setup_databases(settings):
    """
    Override database settings by the test_ database name prefix, and create the database.
    :param settings:
    :return:
    """
    for k, v in settings.items():
        settings[k]['ENGINE'] = _rename_database(settings[k]['ENGINE'])

    # Create databases
    for k in settings:
        recreatedb.recreate(k)

    # Migrate the default database
    migrate.migrate(None, None, True, DEFAULT_DB_ALIAS, None, None, None, verbosity=False)
    upgrade.upgrade(app.addons.keys())


class DiscoverRunner(object):
    test_runner = unittest.TextTestRunner
    test_loader = unittest.TestLoader

    def __init__(self, path):
        self.tests_path = path
        self.loader = self.test_loader()
        self.suite = self.loader.discover(path)
        self.runner = self.test_runner()

    def run(self):
        self.setup_databases()
        self.runner.run(self.suite)

    def setup_databases(self):
        setup_databases(app.config['DATABASES'])
