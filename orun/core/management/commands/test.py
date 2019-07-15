import os
from importlib import import_module
import unittest

from orun.core.management import commands
from orun import apps, app



@commands.command('test', short_help='Run the test cases for the specified app')
@commands.argument(
    'app_label', nargs=1, required=True,
)
@commands.argument(
    'module', nargs=1, required=False
)
def command(app_label, module, **kwargs):
    app_config = apps.apps.app_configs[app_label]
    from orun.test import DiscoverRunner
    runner = DiscoverRunner(os.path.join(app_config.root_path, 'tests'))
    app.testing = True
    runner.run()
