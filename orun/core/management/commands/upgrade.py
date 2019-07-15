import os

from orun import app
from orun.db import models, DEFAULT_DB_ALIAS
from orun.conf import settings
from orun.utils.translation import activate
from orun.core.management import commands
from orun.apps import apps
from orun.core.serializers import get_deserializer
from orun.core.management.commands.loaddata import load_fixture


@commands.command('upgrade')
@commands.argument(
    'app_labels', nargs=-1,
)
@commands.option('--with-demo/--without-demo', default=False, help='Load demo data.')
def command(app_labels, **options):
    upgrade(app_labels, **options)


def upgrade(app_labels, database, **options):
    if database:
        from sqlalchemy.engine.url import make_url
        url = make_url(app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'])
        url.database = database
        app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'] = str(url)

    if not app_labels:
        app_labels = app.addons.keys()
    all_models = []
    Model = app['ir.model']
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
        if model in app.models and isinstance(model, models.Model):
            model = app[model]
            model.init()


class Command(object):
    help = 'Upgrade modules'

    def _load_file(self, app_config, filename):
        activate(settings.LANGUAGE_CODE)
        print('Loading fixture: ', filename)
        load_fixture(app_config, filename)

    def handle_app_config(self, app_config, **options):
        """
        Perform the command's actions for app_config, an AppConfig instance
        corresponding to an application label given on the command line.
        """
        data = getattr(app_config, 'fixtures', None)
        if data:
            for filename in data:
                self._load_file(app_config, filename)
        if 'with_demo' in options:
            demo = getattr(app_config, 'demo', None)
            if demo:
                for filename in demo:
                    filename = os.path.join(app_config.path, 'fixtures', filename)
                    self._load_file(app_config, filename)
