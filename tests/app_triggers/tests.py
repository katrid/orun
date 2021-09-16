from orun.test import TestCase
from orun.apps import apps


class AppTriggerTestCase(TestCase):
    def test_trigger(self):
        Partner = apps['app_triggers.partner']
        Partner.objects.create(name='Partner 1')
