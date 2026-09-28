import gc
import weakref
from unittest import IsolatedAsyncioTestCase
from orun.events import Event

from .models import Invoice, invoice_calculated, InvoiceEvent


class TestEvent(IsolatedAsyncioTestCase):
    async def test_event(self):
        event = Event('test.event')

        hit_counter = 0
        async def _event_listener1(e: Event):
            self.assertEqual(e.name, 'test.event')
            nonlocal hit_counter
            hit_counter += 1

        event.add_listener(_event_listener1)
        await event.dispatch()

        async def _event_listener2(e: Event):
            self.assertEqual(e.name, 'test.event')
            nonlocal hit_counter
            hit_counter += 1

        event.add_listener(_event_listener2, once=True)
        await event.dispatch()
        self.assertEqual(hit_counter, 3)
        await event.dispatch()
        self.assertNotIn(_event_listener2, event.listeners)
        self.assertEqual(hit_counter, 4)

    async def test_weak_listener(self):
        event = Event('test.event')

        hit_counter = 0
        async def _weak_listener(e: Event):
            self.assertEqual(e.name, 'test.event')
            nonlocal hit_counter
            hit_counter += 1

        event.add_listener(_weak_listener, weak=True)
        self.assertEqual(len(event.listeners), 1)
        self.assertIsInstance(next(iter(event.listeners)), weakref.ref)
        await event.dispatch()
        self.assertEqual(hit_counter, 1)

        # drop the only strong reference; the dead weakref must be skipped and removed
        del _weak_listener
        gc.collect()
        await event.dispatch()
        self.assertEqual(hit_counter, 1)
        self.assertEqual(len(event.listeners), 0)

    async def test_model_event(self):
        inv = Invoice(unit_price=100.01, qty=10)
        hit_tested = False
        async def _invoice_calculated_listener(e: InvoiceEvent):
            nonlocal hit_tested
            hit_tested = True
            self.assertEqual(e.sender.unit_price, 100.01)
            self.assertEqual(e.sender.qty, 10)
            self.assertEqual(e.sender.amount, 1000.1)

        invoice_calculated.add_listener(_invoice_calculated_listener)
        await inv.calculate()
        self.assertEqual(inv.amount, 1000.1)
        self.assertTrue(hit_tested)
