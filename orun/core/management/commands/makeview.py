import os

from orun.core.management.base import BaseCommand, CommandError
from orun.apps import apps
from orun.core.management import commands
from orun.db import transaction, DEFAULT_DB_ALIAS


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            'schema', nargs='1',
            help='Specify the schema and filenames.',
        )
        parser.add_argument(
            'model', nargs='1',
            help='Specify the model name.',
        )
        parser.add_argument(
            'view_type', nargs='?',
            help='View type.',
        )
        parser.add_argument(
            '--database',
            default=DEFAULT_DB_ALIAS,
            help='Nominates a specific database to dump fixtures from. '
                 'Defaults to the "default" database.',
        )
    def handle(self, *args, **options):
        app_config = apps.app_configs[options['schema']]
        make_view(app_config, **options)


@transaction.atomic
def make_view(app_config, model_name, view_type, **options):
    if isinstance(app_config, str):
        app_config = apps.app_configs[app_config]
    model = apps[model_name]
    if not view_type:
        view_type = ['form', 'list']
    for v in view_type:
        path = os.path.join(app_config.path, 'templates', 'views', model_name)
        filename = os.path.join(path, v + '.html')
        if not os.path.isdir(path):
            os.makedirs(path)
        view = model.get_view_info(v)
        with open(filename, 'w') as f:
            f.write(view['content'])

