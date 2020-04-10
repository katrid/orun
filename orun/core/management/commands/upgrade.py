import os

from orun.apps import apps
from orun.db import DEFAULT_DB_ALIAS, models
from orun.core.management.base import BaseCommand
from orun.utils.translation import activate
from orun.conf import settings
from orun.core.management.commands.loaddata import load_fixture


def upgrade(app_labels, database, **options):
    if database:
        from sqlalchemy.engine.url import make_url
        url = make_url(apps.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'])
        url.database = database
        apps.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'] = str(url)

    if not app_labels:
        app_labels = apps.addons.keys()
    all_models = []
    Model = apps['ir.model']
    for app_label in app_labels:
        addon = apps.app_configs[app_label]
        for model in addon.models.values():
            if not Model.objects.filter(name=model.Meta.name).first():
                m = Model.create(name=model.Meta.name, object_name=model.Meta.object_name)
        cmd = Command()
        cmd.handle_app_config(addon, **options)
        all_models.extend(addon.models.keys())
    all_models = set(all_models)
    for model in all_models:
        if model in apps.models and isinstance(model, models.Model):
            model = apps[model]
            model.init()


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
                    print('load fixtures', filename)
                    self._load_file(app_config, filename, **options)
            if 'with_demo' in options:
                demo = getattr(app_config, 'demo', None)
                if demo:
                    for filename in demo:
                        filename = os.path.join(app_config.path, 'fixtures', filename)
                        self._load_file(app_config, filename, **options)
