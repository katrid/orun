from datetime import datetime

from orun.test import TestCase
from orun.apps import apps

from .models import Article


class DefaultTests(TestCase):
    def test_field_defaults(self):
        a = Article()
        now = datetime.now()
        a.save()

        self.assertIsInstance(a.id, int)
        self.assertEqual(a.headline, "Default headline")
        self.assertLess((now - a.pub_date).seconds, 5)
