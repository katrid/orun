from orun.test import TestCase
from orun.db import connections, DEFAULT_DB_ALIAS
from orun.db.utils import IntegrityError

from .models import Vendor, Product, ModelWithoutSchema, ModelWithSchema, ModelWithReferences


class MetadataTests(TestCase):
    def test_model_constraint(self):
        conn = connections[DEFAULT_DB_ALIAS]
        editor = conn.schema_editor()
        table = Product._meta.get_metadata(editor)
        constraints = table.constraints.values()
        self.assertEqual(len(constraints), 3)

        Product.objects.create(name='test 1')
        with self.assertRaises(IntegrityError):
            Product.objects.create(name='test 1')

        self.assertEqual(ModelWithoutSchema._meta.qualname, 'model_without_schema')
        self.assertEqual(ModelWithSchema._meta.qualname, 'test_metadata.model_with_schema')

        table = ModelWithSchema._meta.get_metadata(editor)
        constraints = table.constraints.values()
        self.assertEqual(len(constraints), 1)

    def test_model_auto_constraint(self):
        Vendor.objects.create(name='test vendor')
        with self.assertRaises(IntegrityError):
            Vendor.objects.create(name='test vendor')

    def test_model_fk_constraint(self):
        Vendor.objects.create(name='test vendor')
        ModelWithReferences.objects.create(name='test model')
        ModelWithReferences.objects.create(name='test model 2', ref_name1='test vendor')
        with self.assertRaises(IntegrityError):
            ModelWithReferences.objects.create(name='test model 3', ref_name1='invalid vendor')
