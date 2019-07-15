import os
import pkgutil
import sys
from collections import defaultdict, OrderedDict
from importlib import import_module
from threading import Lock

import orun
from orun.conf import ADDONS_ENVIRONMENT_VARIABLE
from orun.core.exceptions import AppRegistryNotReady


class Registry(object):

    def __init__(self, app_configs=None, addons=None):
        self.ready = False
        self.apps_loaded = False
        self.models_ready = False
        if app_configs and isinstance(app_configs, list):
            app_configs = {app_config.app_label: app_config for app_config in app_configs}
        self.app_configs = app_configs or {}
        self.modules = {}
        self.basic_commands = []
        self.module_models = defaultdict(OrderedDict)
        self.module_commands = defaultdict(list)
        self.module_views = defaultdict(list)
        self._lock = Lock()
        self.all_models = OrderedDict()
        self._pending_operations = defaultdict(list)
        base_dir = os.path.join(os.path.dirname(__file__))
        self.addon_path = [os.path.join(base_dir, '..', 'addons'), os.path.join(base_dir, '..', '..', 'addons')]  # basic addons paths
        self.addons = addons

        if ADDONS_ENVIRONMENT_VARIABLE in os.environ:
            paths = os.environ[ADDONS_ENVIRONMENT_VARIABLE].split(';')
            sys.path.extend(paths)
            self.addon_path.extend(paths)

    def find_commands(self, management_dir):
        """
        Given a path to a management directory, returns a list of all the command
        names that are available.

        Returns an empty list if no commands are defined.
        """
        command_dir = os.path.join(management_dir, 'commands')
        return [name for _, name, is_pkg in pkgutil.iter_modules([command_dir])
                if not is_pkg and not name.startswith('_')]

    def setup(self):
        self.ready = True
        self.find_addons()
        self.models_ready = True

        # Find basic commands
        for mod_name in self.find_commands(os.path.join(os.path.dirname(orun.__file__), 'core', 'management')):
            try:
                mod = import_module('orun.core.management.commands.%s' % mod_name)
                self.module_commands['orun'].append(mod.command)
            except ImportError:
                raise
                pass
        for cmd in self.module_commands['orun']:
            self.basic_commands.append(cmd)

    def load_addon(self, module):
        try:
            mod = import_module(module)
            app_config = mod.addon
            app_config.path = os.path.dirname(mod.__file__)
            self.modules[module] = mod
            self.app_configs[module] = app_config
        except (ImportError, AttributeError) as e:
            print('Error loading', module)
            print(e)
            pass

    def find_addons(self):
        self.apps_loaded = True
        paths = self.addon_path
        with self._lock:
            for path in paths:
                sys.path.append(path)
                for _, name, is_pkg in pkgutil.iter_modules([path]):
                    if is_pkg and not name.startswith('_'):
                        self.load_addon(name)

            if self.addons:
                for addon in self.addons:
                    self.load_addon(addon)


    def check_models_ready(self):
        """
        Raises an exception if all models haven't been imported yet.
        """
        if not self.models_ready:
            raise AppRegistryNotReady("Models aren't loaded yet.")

    def register_model(self, mod_name, model):
        self.all_models[model._meta.name] = model
        self.module_models[mod_name][model._meta.model_name] = model
        if mod_name in self.app_configs:
            self.app_configs[mod_name].models[model._meta.name] = model
        #self.do_pending_operations(model)

    # Migration related methods

    def get_app_configs(self):
        return self.app_configs.values()

    def get_app_config(self, app_label):
        return self.app_configs[app_label]

    def get_models(self):
        for module in self.module_models:
            for model in self.module_models[module].values():
                yield model

    def get_model(self, app_label, model_name=None):
        if model_name is None:
            app_label, model_name = app_label.split('.')
        return self.module_models[app_label][model_name]

    def do_pending_operations(self, model):
        """
        Take a newly-prepared model and pass it to each function waiting for
        it. This is called at the very end of Apps.register_model().
        """
        key = model._meta.app_label, model._meta.model_name
        for function in self._pending_operations.pop(key, []):
            function(model)

    def __getitem__(self, item):
        return self.app_configs[item]

    def clear_cache(self):
        ...

# Start main registry
apps = registry = Registry()
