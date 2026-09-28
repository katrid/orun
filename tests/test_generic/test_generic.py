from orun.test import TestCase

from .models import ModelWithGeneric, ModelB, ModelA


class TestGeneric(TestCase):
    def test_generic(self):
        ModelA.objects.create(name='Record A1')
        ModelB.objects.create(name='Record B1')
        obj = ModelWithGeneric.objects.create(model_name=ModelA._meta.name, object_id=ModelA.objects.first().pk)
        self.assertEqual(obj.ref_object.name, 'Record A1')
        obj.ref_object = None
        self.assertEqual(obj.ref_object, None)
        obj.refresh_from_db()
        self.assertEqual(obj.ref_object.name, 'Record A1')

        obj.ref_object = ModelB.objects.first()
        self.assertEqual(obj.ref_object.name, 'Record B1')
        obj.refresh_from_db()
        self.assertEqual(obj.ref_object.name, 'Record A1')
        obj.update(model_name=ModelB._meta.name, object_id=ModelB.objects.first().pk)
        obj.refresh_from_db()
        self.assertEqual(obj.ref_object.name, 'Record B1')
        obj.ref_object = ModelA.objects.first()
        obj.save()
        self.assertEqual(obj.ref_object.name, 'Record A1')
