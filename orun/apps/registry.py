import sys
from typing import TYPE_CHECKING, Dict, Type
from threading import RLock, Event, local, Thread
from collections import Counter, defaultdict, OrderedDict
import functools
import jinja2

from orun.utils.module_loading import import_module
from contextvars import ContextVar
from orun.apps import AppConfig
from orun import SUPERUSER
from orun.core.exceptions import ImproperlyConfigured, AppRegistryNotReady
if TYPE_CHECKING:
    from orun.db.models.base import ModelBase, Model


class Registry:
    loop = None

    def __init__(self, installed_apps=()):
        # installed_apps is set to None when creating the master registry
        # because it cannot be populated at that point. Other registries must
        # provide a list of installed apps and are populated immediately.
        if installed_apps is None and hasattr(sys.modules[__name__], 'apps'):
            raise RuntimeError("You must supply an installed_apps argument.")

        # set to False if the current process is not the main
        self.main = True
        # get a new event loop
        self.models: Dict[str, Type[Model]] = {}
        self.services = {}
        self.app_configs: Dict[str, AppConfig] = {}
        self.addons = self.app_configs
        self._lock = RLock()
        self._pending_operations = defaultdict(list)
        self.ready_event = Event()
        self.loading = self.app_ready = self.models_ready = self.ready = False

        # Stack of addons. Used to store the current state in
        # set_available_apps and set_installed_apps.
        self.stored_apps = []

        self._local_ctx = local()
        root_env = Environment(self, user_id=SUPERUSER)
        self._local_var = ContextVar('local_env', default=root_env)
        self.env = LazyEnvironment(self, root_env)

    def create_template_env(self):
        from orun.utils.filters import default_filter
        env = jinja2.Environment()
        env.filters['defaultformat'] = default_filter
        return env

    def populate(self, installed_apps=None):
        """
        Load application configurations and models.

        Import each application module and then each model module.

        It is thread-safe and idempotent, but not reentrant.
        """
        if self.ready:
            return

        # populate() might be called by two threads in parallel on servers
        # that create threads before initializing the WSGI callable.
        with self._lock:
            if self.ready:
                return

            # An RLock prevents other threads from entering this section. The
            # compare and set operation below is atomic.
            if self.loading:
                # Prevent reentrant calls to avoid running AppConfig.ready()
                # methods twice.
                raise RuntimeError("populate() isn't reentrant")
            self.loading = True

            # Phase 1: initialize app configs and import app modules.
            for addon in installed_apps:
                if isinstance(addon, str):
                    addon = AppConfig.create(addon, self)
                if addon.name in self.app_configs:
                    continue
                    # raise ImproperlyConfigured(
                    #     "Application schema aren't unique, "
                    #     "duplicates: %s" % addon.schema)

                self.app_configs[addon.name] = addon
                addon.app = self

            # Check for duplicate app names.
            counts = Counter(app_config.name for app_config in self.app_configs.values())
            duplicates = [
                name for name, count in counts.most_common() if count > 1]
            if duplicates:
                raise ImproperlyConfigured(
                    "Application names aren't unique, "
                    "duplicates: %s" % ", ".join(duplicates))

            self.app_ready = True

            # Phase 2: import models modules.
            for app_config in self.app_configs.values():
                app_config.import_models()

            # Phase 3: apply pending operations
            self.do_pending_operations()

            self.clear_cache()

            self.models_ready = True

            # Phase 4: run ready() methods of app configs.
            for app_config in self.app_configs.values():
                app_config.import_views()
                app_config.ready()

            self.ready = True
            self.ready_event.set()

        self.template_env = self.create_template_env()

    def setup_loop(self):
        import asyncio
        self.loop = asyncio.new_event_loop()
        for addon in self.app_configs.values():
            if hasattr(addon, 'init_app'):
                addon.init_app(self)
        Thread(target=self.start_async_loop, args=(self.loop,), daemon=True).start()

    def __getitem__(self, item) -> 'ModelBase':
        if not isinstance(item, str):
            item = item.Meta.name
        return self.services[item]

    def __setitem__(self, key, value):
        self.services[key] = value

    def clear_cache(self):
        """
        Clear all internal caches, for methods that alter the app registry.

        This is mostly used in tests.
        """
        if self.ready:
            for model in self.models.values():
                model._meta._expire_cache()

    def get_containing_app_config(self, object_name):
        """
        Look for an app config containing a given object.

        object_name is the dotted Python path to the object.

        Return the app config for the inner application in case of nesting.
        Return None if the object isn't in any registered app config.
        """
        self.check_apps_ready()
        candidates = []
        for app_config in reversed(list(self.app_configs.values())):
            if object_name.startswith(app_config.name):
                subpath = object_name[len(app_config.name):]
                if subpath == '' or subpath[0] == '.':
                    candidates.append(app_config)
        if candidates:
            return candidates[0]
            return sorted(candidates, key=lambda ac: -len(ac.schema))[0]

    def get_app_configs(self):
        """Import applications and return an iterable of add-ons."""
        self.check_apps_ready()
        return self.app_configs.values()

    def check_apps_ready(self):
        """Raise an exception if all apps haven't been imported yet."""
        if not self.app_ready:
            from orun.conf import settings
            # If "not ready" is due to unconfigured settings, accessing
            # INSTALLED_APPS raises a more helpful ImproperlyConfigured
            # exception.
            settings.INSTALLED_APPS
            raise AppRegistryNotReady("Application aren't loaded yet.")

    def check_models_ready(self):
        """Raise an exception if all models haven't been imported yet."""
        if not self.models_ready:
            raise AppRegistryNotReady("Models aren't loaded yet.")

    def register_service(self, service, name: str = None):
        self.services[name or service.__qualname__] = service

    def register_model(self, model):
        self.models[model._meta.name] = model
        self.register_service(model, model._meta.name)

    def lazy_model_operation(self, function, model_name):
        if self.models_ready and model_name in self.models:
            function(self.models[model_name])
        else:
            self._pending_operations[model_name].append(function)

    def do_pending_operations(self):
        for k, v in tuple(self._pending_operations.items()):
            model = self.models[k]
            for fn in v:
                fn(model)
        self._pending_operations = defaultdict(list)

    def set_available_apps(self, available):
        """
        Restrict the set of installed apps used by get_app_config[s].

        available must be an iterable of application names.

        set_available_apps() must be balanced with unset_available_apps().

        Primarily used for performance optimization in TransactionTestCase.

        This method is safe in the sense that it doesn't trigger any imports.
        """
        available = set(available)
        installed = {app_config.name for app_config in self.get_app_configs()}
        if not available.issubset(installed):
            raise ValueError(
                "Available apps isn't a subset of installed apps, extra apps: %s"
                % ", ".join(available - installed)
            )

        self.stored_apps.append(self.app_configs)
        self.app_configs = OrderedDict(
            (label, app_config)
            for label, app_config in self.app_configs.items()
            if app_config.name in available)
        self.clear_cache()

    def unset_available_apps(self):
        """Cancel a previous call to set_available_apps()."""
        self.app_configs = self.stored_apps.pop()
        self.clear_cache()

    def set_installed_apps(self, installed):
        """
        Enable a different set of installed apps for get_app_config[s].

        installed must be an iterable in the same format as INSTALLED_APPS.

        set_installed_apps() must be balanced with unset_installed_apps(),
        even if it exits with an exception.

        Primarily used as a receiver of the setting_changed signal in tests.

        This method may trigger new imports, which may add new models to the
        registry of all imported models. They will stay in the registry even
        after unset_installed_apps(). Since it isn't possible to replay
        imports safely (e.g. that could lead to registering listeners twice),
        models are registered when they're imported and never removed.
        """
        if not self.ready:
            raise AppRegistryNotReady("App registry isn't ready yet.")
        self.stored_apps.append(self.app_configs)
        self.app_configs = {}
        self.apps_ready = self.models_ready = self.loading = self.ready = False
        self.clear_cache()
        self.populate(installed)

    def unset_installed_apps(self):
        """Cancel a previous call to set_installed_apps()."""
        self.app_configs = self.stored_apps.pop()
        self.apps_ready = self.models_ready = self.ready = True
        self.clear_cache()

    def is_installed(self, app_name):
        """
        Check whether an application with this name exists in the registry.

        app_name is the full name of the app e.g. 'orun.contrib.admin'.
        """
        self.check_apps_ready()
        return any(ac.name == app_name for ac in self.app_configs.values())

    # This method is performance-critical at least for Django's test suite.
    @functools.lru_cache(maxsize=None)
    def get_models(self, include_auto_created=False, include_swapped=False):
        """
        Return a list of all installed models.

        By default, the following models aren't included:

        - auto-created models for many-to-many relations without
          an explicit intermediate table,
        - models that have been swapped out.

        Set the corresponding keyword argument to True to include such models.
        """
        self.check_models_ready()

        return list(self.models.values())

    def get_model(self, name, require_ready=True):
        """
        Return the model matching the given app_label and model_name.

        As a shortcut, app_label may be in the form <app_label>.<model_name>.

        model_name is case-insensitive.

        Raise LookupError if no application exists with this label, or no
        model exists with this name in the application. Raise ValueError if
        called with a single argument that doesn't contain exactly one dot.
        """
        if require_ready:
            self.check_models_ready()
        else:
            self.check_apps_ready()

        return self.models[name]

    def start_async_loop(self, loop):
        loop.set_debug(True)
        loop.run_forever()

    def collect_js_assets(self):
        assets = []
        for app in self.app_configs.values():
            if app.js_assets:
                assets += app.js_assets
        return assets

    def add_app(self, app_config: AppConfig):
        if self.ready:
            pass


from .context import Environment, LazyEnvironment
apps = Registry()

def get_dependencies(addon, registry):
    r = []
    if isinstance(addon, str):
        addon = registry.app_configs[addon]
    deps = addon.dependencies
    if deps:
        for dep in addon.dependencies:
            r += get_dependencies(dep,registry)
        return r + list(addon.dependencies)
    return []


def adjust_dependencies(app_configs, registry=apps):
    # adjust module dependency priority
    lst = list(app_configs)
    for entry in lst:
        deps = get_dependencies(entry, registry=registry)
        if deps:
            app_configs.remove(entry)
            i = 0
            for dep in deps:
                if not dep in app_configs:
                    app_configs.append(dep)
                    i = len(app_configs) - 1
                    continue
                i = max(i, app_configs.index(dep))
            if i == 0:
                app_configs.append(entry)
            else:
                app_configs.insert(i + 1, entry)
    return app_configs


