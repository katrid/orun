import argparse
import os
import inspect
from pathlib import Path
from importlib import import_module
from subprocess import call

from orun.apps import apps
from orun.core import serializers
from orun.db import DEFAULT_DB_ALIAS, transaction
from orun.core.management.base import BaseCommand, CommandError


def _load_from_module(module):
    from orun.contrib.contenttypes.models import Registrable
    # if module is a package load each submodule individually
    if os.path.basename(module.__file__).startswith('__init__'):
        submodules = [import_module(module.__name__ + f".{f.replace('.py', '')}") for f in filter(lambda x: not x.startswith('_'), os.listdir(os.path.dirname(module.__file__)))]
        for submodule in submodules:
            _load_from_module(submodule)

    members = [(inspect.getsourcelines(m)[1], m) for _, m in inspect.getmembers(module, inspect.isclass) if not m.__name__.startswith('_')]
    members.sort(key=lambda m: m[0])
    for _, member in members:
        if inspect.ismodule(member):
            if member.__name__.startswith(f'{module.__name__}.'):
                _load_from_module(member)
        if isinstance(member, type) and member.__module__ == module.__name__:
            if getattr(member, '_admin_registrable', None):
                if issubclass(member, Registrable):
                    member.update_info()
                else:
                    member._admin_registrable.update_info()


def load_fixture(schema, *filenames, **options):
    if isinstance(schema, str):
        addon = apps.app_configs[schema]
    else:
        addon = schema
    for filename in filenames:
        # TODO move to admin serializer
        if filename.endswith('.admin'):
            # fixture is module name
            filename = import_module(filename)
        # load data from module registrable objects
        if inspect.ismodule(filename):
            _load_from_module(filename)
        else:
            filename = os.path.join(addon.path, 'fixtures', filename)
            fixture, fmt = filename.rsplit('.', 1)
            deserializer = serializers.get_deserializer(fmt)
            d = deserializer(Path(filename), addon=addon, format=fmt, filename=filename, **options)

            with transaction.atomic(options['database']):
                if options.get('update_existing') is None or not options['update_existing']:
                    d.deserialize()
                else:
                    d.deserialize(update=True)
            if d.postpone:
                for op in d.postpone:
                    op()


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            'args', nargs='+',
            help='Specify the schema and filenames.',
        )
        parser.add_argument(
            '--database',
            default=DEFAULT_DB_ALIAS,
            help='Nominates a specific database to dump fixtures from. '
                 'Defaults to the "default" database.',
        )
        parser.add_argument(
            '-l', '--file-list',
            help='Specify a file containing a list of fixture files.',
        )
        parser.add_argument(
            '-u', '--update-existing', action=argparse.BooleanOptionalAction,
            default=False,
            help='Force the update of the corresponding database rows.'
        )

    def handle(self, schema, *filenames, **options):
        file_list = options.get('file_list')
        if file_list:
            with open(file_list, 'r') as f:
                filenames = [f.strip() for f in f.readlines()]
        load_fixture(schema, *filenames, **options)
