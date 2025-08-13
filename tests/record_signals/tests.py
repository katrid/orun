from orun.test import TestCase
from orun.db.models.signals import before_insert, after_insert, before_update, after_update, trigger

from .models import ModelA


class SignalTestCase(TestCase):
    def test_signals(self):
        self._record1 = None
        self._record2 = None
        def _before(record, values):
            self._record1 = record
            self.assertEqual(self._record2, None)
        def _after(record, values):
            self._record2 = record
        before_insert.connect(ModelA, _before)
        after_insert.connect(ModelA, _after)
        rec = ModelA.objects.create(name='Test 1')
        self.assertEqual(rec, self._record2)

        self._record1 = None
        self._record2 = None
        before_insert.disconnect(ModelA, _before)
        after_insert.disconnect(ModelA, _after)
        ModelA.objects.create(name='Test 2')
        self.assertIsNone(self._record1)
        self.assertIsNone(self._record2)

        trigger(before_insert, ModelA, when=lambda record, event: event.update('name') and record.name == 'Test 3')(_before)
        rec = ModelA.objects.create(name='Test 3')
        self.assertEqual(rec, self._record1)
        self.assertIsNone(self._record2)
        before_insert.disconnect(ModelA, _before)
        after_insert.disconnect(ModelA, _after)

        self._record1 = None
        self._record2 = None
        ModelA.objects.create(name='Test 4')
        self.assertIsNone(self._record1)
        self.assertIsNone(self._record2)
        trigger(before_insert, ModelA, when=lambda record, event: event.update('name') and record.name == 'Test 5')(_before)
        trigger(after_insert, ModelA, when=lambda record, event: event.update('name') and record.name == 'Test 5')(_after)
        ModelA.objects.create(name='Test 6')
        self.assertIsNone(self._record1)
        self.assertIsNone(self._record2)
        rec = ModelA.objects.create(name='Test 5')
        self.assertEqual(rec, self._record1)
        self.assertEqual(rec, self._record2)

        self._record1 = None
        self._record2 = None
        trigger(before_update, ModelA, when=lambda record, event: event.update('name') and record.name == 'Test 8')(_before)
        trigger(after_update, ModelA, when=lambda record, event: event.update('name') and record.name == 'Test 7')(_after)
        rec.update(name='Test 8')
        self.assertEqual(rec, self._record1)
        self.assertIsNone(self._record2)
        self._record1 = None
        rec.update(name='Test 7')
        self.assertIsNone(self._record1)
        self.assertEqual(rec, self._record2)
