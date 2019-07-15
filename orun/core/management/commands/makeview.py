import os

from orun import app
from orun.apps import apps
from orun.core.management import commands
from orun.db import transaction


@commands.command('makeviews')
@commands.argument(
    'app_label', nargs=1,
)
@commands.argument(
    'model_name', nargs=1,
)
@commands.argument(
    'view_type', nargs=-1,
)
def command(app_label, model_name, view_type, **options):
    make_view(app_label, model_name, view_type, **options)


@transaction.atomic
def make_view(app_config, model_name, view_type, **options):
    if isinstance(app_config, str):
        app_config = apps.app_configs[app_config]
    model = app[model_name]
    if not view_type:
        view_type = ['form', 'list']
    for v in view_type:
        path = os.path.join(app_config.path, 'templates', 'views', model_name)
        filename = os.path.join(path, v + '.xml')
        if not os.path.isdir(path):
            os.makedirs(path)
        view = model.get_view_info(v)
        with open(filename, 'w') as f:
            f.write(view['content'])

