from orun.test import TestCase

from .models import InstrumentedModel, ChildInstrumentedModel, InstrumentedHelperModel, NewModel


class TestInstruments(TestCase):
    def test_instruments(self):
        self.assertIn('Instrument', InstrumentedModel.__model_instruments__)
        self.assertEqual(InstrumentedModel.Instrument.x, 1)
        self.assertEqual(ChildInstrumentedModel.Instrument.x, 2)
        # class with a contributor descendent must override attributes
        self.assertEqual(InstrumentedHelperModel.Instrument.x, 3)
        self.assertEqual(NewModel.Instrument.x, 3)

    def test_rules(self):
        n = NewModel()
        # value with latest helper/contributor method override
        self.assertEqual(n.calc(), 20)
