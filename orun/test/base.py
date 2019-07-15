import unittest
from orun.apps.registry import registry
from orun.apps import Application


class ApplicationTestCase(unittest.TestCase):
    addons: list = None

    @classmethod
    def setUpClass(cls):
        registry.addons = cls.addons
        registry.setup()
        cls.app = Application('test-app', addons=cls.addons, settings={'SQL_DEBUG': True})
        cls.app.setup()


class AddOnTestCase(unittest.TestCase):
    pass
