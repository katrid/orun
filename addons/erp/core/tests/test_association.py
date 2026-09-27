from orun.test import TestCase
from erp.core.models import Association
from erp.core.models.content import refresh_model_cache

from .models import Partner


class TestAssociation(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        refresh_model_cache()

    def test_association(self):
        p1 = Partner.objects.create(name='Partner 1')
        p2 = Partner.objects.create(name='Partner 2')
        Association.link(p1, p2, description='Partner 1 and 2 are associated now')
