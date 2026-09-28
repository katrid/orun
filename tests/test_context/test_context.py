from unittest import TestCase

from orun.apps.context import Context


class TestContext(TestCase):
    def test_context(self):
        ctx = Context(user_id=1)
        with ctx:
            self.assertEqual(ctx['user_id'], 1)
            with ctx(user_id=2) as ctx:
                self.assertEqual(ctx['user_id'], 2)
                with ctx(user_id=3) as ctx:
                    self.assertEqual(ctx['user_id'], 3)
                self.assertEqual(ctx['user_id'], 2)
                with ctx(user_id=4) as ctx:
                    self.assertEqual(ctx['user_id'], 4)
                self.assertEqual(ctx['user_id'], 2)
            self.assertEqual(ctx['user_id'], 1)
        self.assertEqual(ctx['user_id'], 1)

        with ctx(user_id=5) as ctx:
            self.assertEqual(ctx.user_id, 5)
