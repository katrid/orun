from orun.test import TestCase

from .models import Author


class DefaultTests(TestCase):
    def test_field_defaults(self):
        a = Author()
        a.name = 'Charles Darwin'
        a.save()
