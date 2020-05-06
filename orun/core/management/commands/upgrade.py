import os

from orun.apps import apps
from orun.db import DEFAULT_DB_ALIAS, models
from orun.core.management.base import BaseCommand
from orun.utils.translation import activate
from orun.conf import settings
from orun.core.management.commands.loaddata import load_fixture


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            'schema', nargs='?',
            help='Specify the schema and filenames.',
        )
        parser.add_argument(
            '--database',
            default=DEFAULT_DB_ALIAS,
            help='Nominates a specific database to dump fixtures from. '
                 'Defaults to the "default" database.',
        )

    def _load_file(self, app_config, filename, **options):
        activate(settings.LANGUAGE_CODE)
        print('Loading fixture: ', filename)
        load_fixture(app_config, filename, **options)

    def handle(self, schema, **options):
        """
        Perform the command's actions for app_config, an AppConfig instance
        corresponding to an application label given on the command line.
        """
        database = options['database']
        if schema:
            addons = [apps.addons[schema]]
        else:
            addons = schema or apps.addons.values()
        for app_config in addons:
            data = getattr(app_config, 'fixtures', None)
            if data:
                for filename in data:
                    self._load_file(app_config, filename, **options)
            if 'with_demo' in options:
                demo = getattr(app_config, 'demo', None)
                if demo:
                    for filename in demo:
                        filename = os.path.join(app_config.path, 'fixtures', filename)
                        self._load_file(app_config, filename, **options)
