import os

from orun import app
from orun.apps import apps
from orun.core.management import commands
from orun.core.serializers import get_deserializer
from orun.db import transaction


@commands.command('loaddata')
@commands.argument(
    'app_label', nargs=1,
)
@commands.argument(
    'fixture', nargs=1,
)
@commands.option('--encoding', default='utf-8')
def command(app_label, fixture, **options):
    load_fixture(app_label, fixture, **options)


def load_fixture(app_config, filename, **options):
    if isinstance(app_config, str):
        app_config = apps.app_configs[app_config]
    filename = os.path.join(app_config.root_path, 'fixtures', filename)
    fmt = filename.rsplit('.', 1)[1]
    deserializer = get_deserializer(fmt)
    d = deserializer(app, app_config=app_config, filename=filename)

    with transaction.begin:
        d.execute()
    if d.postpone:
        for op in d.postpone:
            op()
