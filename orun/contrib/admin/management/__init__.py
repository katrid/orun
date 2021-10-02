from orun.apps import apps as global_apps
from orun.db import DEFAULT_DB_ALIAS, router, transaction
from orun.utils.module_loading import module_has_submodule, import_module
from orun.db.utils import IntegrityError


ADMIN_MODULE_NAME = 'admin'


def admin_auto_register(sender, verbosity=2, interactive=True, using=DEFAULT_DB_ALIAS, apps=global_apps, **kwargs):
    """
    Auto register admin objects to database
    """
    # check if there's an admin module
    for app in apps.app_configs.values():
        if module_has_submodule(app.module, ADMIN_MODULE_NAME):
            mod_path = '%s.%s' % (app.name, ADMIN_MODULE_NAME)
            mod = import_module(mod_path)
            app.admin_module = mod
    from orun.contrib.admin.site import admin_site
    admin_site.update()
