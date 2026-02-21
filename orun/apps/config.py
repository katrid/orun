import inspect
import os
from importlib import import_module
import glob
from typing import List

from orun.core.signals import Signal
from orun.conf import settings
from orun.utils.module_loading import import_string, module_has_submodule
from orun.core.exceptions import ImproperlyConfigured


APPS_MODULE_NAME = 'apps'
MODELS_MODULE_NAME = 'models'
VIEWS_MODULE_NAME = 'views'


class AppConfig:
    name: str = None
    schema: str = None
    db_schema: str = None
    create_schema = True
    verbose_name: str = None
    js_assets: List[str] = None
    fixtures = None
    default_language = None
    dependencies = None
    installable = False
    auto_install = False
    version: str = None
    urls_module: str = None
    managed = True

    def __init__(self, app_name: str, app_module: str = None):
        self.name = app_name
        if app_module is None:
            app_module = import_module(self.__module__)
        self.module = app_module
        self.models = []
        self.models_module = None
        self.view_module = None
        if not self.schema:
            self.schema = self.name.rpartition('.')[2]

        # Human-readable name for the application e.g. "Admin".
        if self.verbose_name is None:
            self.verbose_name = self.schema.title()

        # Filesystem path to the application directory e.g.
        # '/path/to/orun/contrib/admin'.
        if not hasattr(self, 'path'):
            self.path = self._path_from_module(app_module)

    @classmethod
    def create(cls, entry, registry=None):
        """
        Factory that creates an app config from an entry in INSTALLED_APPS.
        """
        # create() eventually returns app_config_class(app_name, app_module).
        app_config_class = None
        app_name = None
        app_module = None

        # If import_module succeeds, entry points to the app module.
        try:
            app_module = import_module(entry)
        except Exception:
            pass
        else:
            # If app_module has an apps submodule that defines a single
            # AppConfig subclass, use it automatically.
            # To prevent this, an AppConfig subclass can declare a class
            # variable default = False.
            # If the apps module defines more than one AppConfig subclass,
            # the default one can declare default = True.
            if module_has_submodule(app_module, APPS_MODULE_NAME):
                mod_path = '%s.%s' % (entry, APPS_MODULE_NAME)
                mod = import_module(mod_path)
                # Check if there's exactly one AppConfig candidate,
                # excluding those that explicitly define default = False.
                app_configs = [
                    (name, candidate)
                    for name, candidate in inspect.getmembers(mod, inspect.isclass)
                    if (
                            issubclass(candidate, cls) and
                            candidate is not cls and
                            getattr(candidate, 'default', True)
                    )
                ]
                if len(app_configs) == 1:
                    app_config_class = app_configs[0][1]
                    app_config_name = '%s.%s' % (mod_path, app_configs[0][0])
                else:
                    # Check if there's exactly one AppConfig subclass,
                    # among those that explicitly define default = True.
                    app_configs = [
                        (name, candidate)
                        for name, candidate in app_configs
                        if getattr(candidate, 'default', False)
                    ]
                    if len(app_configs) > 1:
                        candidates = [repr(name) for name, _ in app_configs]
                        raise RuntimeError(
                            '%r declares more than one default AppConfig: '
                            '%s.' % (mod_path, ', '.join(candidates))
                        )
                    elif len(app_configs) == 1:
                        app_config_class = app_configs[0][1]
                        app_config_name = '%s.%s' % (mod_path, app_configs[0][0])

            # If app_module specifies a default_app_config, follow the link.
            # default_app_config is deprecated, but still takes over the
            # automatic detection for backwards compatibility during the
            # deprecation period.
            try:
                new_entry = app_module.default_app_config
            except AttributeError:
                # Use the default app config class if we didn't find anything.
                if app_config_class is None:
                    app_config_class = cls
                    app_name = entry
            else:
                entry = new_entry
                app_config_class = None

        # If import_string succeeds, entry is an app config class.
        if app_config_class is None:
            try:
                app_config_class = import_string(entry)
            except Exception:
                pass
        # If both import_module and import_string failed, it means that entry
        # doesn't have a valid value.
        if app_module is None and app_config_class is None:
            # If the last component of entry starts with an uppercase letter,
            # then it was likely intended to be an app config class; if not,
            # an app module. Provide a nice error message in both cases.
            mod_path, _, cls_name = entry.rpartition('.')
            if mod_path and cls_name[0].isupper():
                # We could simply re-trigger the string import exception, but
                # we're going the extra mile and providing a better error
                # message for typos in INSTALLED_APPS.
                # This may raise ImportError, which is the best exception
                # possible if the module at mod_path cannot be imported.
                mod = import_module(mod_path)
                candidates = [
                    repr(name)
                    for name, candidate in inspect.getmembers(mod, inspect.isclass)
                    if issubclass(candidate, cls) and candidate is not cls
                ]
                msg = "Module '%s' does not contain a '%s' class." % (mod_path, cls_name)
                if candidates:
                    msg += ' Choices are: %s.' % ', '.join(candidates)
                raise ImportError(msg)
            else:
                # Re-trigger the module import exception.
                import_module(entry)

        # Check for obvious errors. (This check prevents duck typing, but
        # it could be removed if it became a problem in practice.)
        if not issubclass(app_config_class, AppConfig):
            raise ImproperlyConfigured(
                "'%s' isn't a subclass of AppConfig." % entry)

        # Obtain app name here rather than in AppClass.__init__ to keep
        # all error checking for entries in INSTALLED_APPS in one place.
        if app_name is None:
            try:
                app_name = app_config_class.name
            except AttributeError:
                raise ImproperlyConfigured(
                    "'%s' must supply a name attribute." % entry
                )

        # Ensure app_name points to a valid module.
        try:
            app_module = import_module(app_name)
        except ImportError:
            raise ImproperlyConfigured(
                "Cannot import '%s'. Check that '%s.%s.name' is correct." % (
                    app_name,
                    app_config_class.__module__,
                    app_config_class.__qualname__,
                )
            )

        # Adjust app config dependencies
        app_config = app_config_class(app_name, app_module)
        if app_config.dependencies:
            for dep in app_config.dependencies:
                if dep not in registry.app_configs:
                    registry.app_configs[dep] = cls.create(dep, registry)

        # Entry is a path to an app config class.
        return app_config

    def _path_from_module(self, module):
        """Attempt to determine app's filesystem path from its module."""
        # See #21874 for extended discussion of the behavior of this method in
        # various cases.
        # Convert paths to list because Python's _NamespacePath doesn't support
        # indexing.
        paths = list(getattr(module, '__path__', []))
        if len(paths) != 1:
            filename = getattr(module, '__file__', None)
            if filename is not None:
                paths = [os.path.dirname(filename)]
            else:
                # For unknown reasons, sometimes the list returned by __path__
                # contains duplicates that must be removed (#25246).
                paths = list(set(paths))
        if len(paths) > 1:
            raise ImproperlyConfigured(
                "The app module %r has multiple filesystem locations (%r); "
                "you must configure this app with an AppConfig subclass "
                "with a 'path' class attribute." % (module, paths))
        elif not paths:
            raise ImproperlyConfigured(
                "The app module %r has no filesystem location, "
                "you must configure this app with an AppConfig subclass "
                "with a 'path' class attribute." % (module,))
        return paths[0]

    def import_models(self):
        # Dictionary of models for this app, primarily maintained in the
        # 'all_models' attribute of the Apps this AppConfig is attached to.
        if module_has_submodule(self.module, MODELS_MODULE_NAME):
            models_module_name = '%s.%s' % (self.name, MODELS_MODULE_NAME)
            self.models_module = import_module(models_module_name)

    def import_views(self):
        if module_has_submodule(self.module, VIEWS_MODULE_NAME):
            views_module_name = '%s.%s' % (self.name, VIEWS_MODULE_NAME)
            self.views_module = import_module(views_module_name)

    def get_models(self, include_auto_created=False):
        for model in self.models:
            if include_auto_created or not model.Meta.auto_created:
                yield model

    def ready(self):
        """
        Override this method in subclasses to run code when Orun starts.
        """
        app_config_ready.send(self)

    def get_js_templates(self):
        for templ in self.js_templates:
            if '*' in templ:
                for fname in glob.glob(templ):
                    with open(os.path.join(self.path, fname), 'rb') as f:
                        yield f.read()
            with open(os.path.join(self.path, templ), 'rb') as f:
                yield f.read()

    def _load_file(self, filename: str, **options):
        from orun.utils.translation import activate
        from orun.core.management.commands.loaddata import load_fixture
        activate(settings.LANGUAGE_CODE)
        print('    ', filename)
        load_fixture(self, filename, **options)

    def load_fixtures(self, **options):
        if self.fixtures:
            print('\nLoading Fixtures: ', self.schema)
            for filename in self.fixtures:
                self._load_file(filename, **options)

    @property
    def docs_path(self):
        return os.path.join(self.path, 'docs')


app_config_ready = Signal()
