from orun.test import TestCase
from orun.apps import apps
from orun.db import connection


class FixturesTest(TestCase):
    fixtures = (
        (
            'admin_fixtures', (
            )
        ),
        (
            'admin', (
                'templates.xml',
            ),
        ),
    )
