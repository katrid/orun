import os
from importlib import import_module
import glob
from typing import List

from orun.utils.module_loading import module_has_submodule
from orun.core.exceptions import ImproperlyConfigured


MODELS_MODULE_NAME = 'models'
API_MODULE_NAME = 'api'


class Addon:
    name: str = None
    schema: str = None
    db_schema: str = None
    verbose_name: str = None
    js_templates: List[str] = None
    fixtures = None
    default_language = None
    dependencies = None
    installable = False
    auto_install = False
    version: str = None

    def __init__(self, app_name: str, app_module):
        self.name = app_name
        self.module = app_module
        self.models = []
        self.models_module = None
        self.api_module = None
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
    def create(cls, entry):
        """
        Factory that creates an addon from an entry in INSTALLED_APPS.
        """
        module = import_module(entry)
        try:
            addon_module = import_module(entry + '.addon')
        except:
            return Addon(entry, module)
        else:
            return addon_module.Addon(entry, module)

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

    def import_api(self):
        # Dictionary of models for this app, primarily maintained in the
        # 'all_models' attribute of the Apps this AppConfig is attached to.
        if module_has_submodule(self.module, API_MODULE_NAME):
            api_module_name = '%s.%s' % (self.name, API_MODULE_NAME)
            self.api_module = import_module(api_module_name)

    def get_models(self, include_auto_created=False):
        for model in self.models:
            if include_auto_created or not model.Meta.auto_created:
                yield model

    def ready(self):
        """
        Override this method in subclasses to run code when Orun starts.
        """

    def get_js_templates(self):
        for templ in self.js_templates:
            if '*' in templ:
                for fname in glob.glob(templ):
                    with open(os.path.join(self.path, fname), 'rb') as f:
                        yield f.read()
            with open(os.path.join(self.path, templ), 'rb') as f:
                yield f.read()
