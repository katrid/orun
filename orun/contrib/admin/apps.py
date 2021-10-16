import asyncio

from orun.core import checks
from orun.apps import AppConfig
from orun.db.models.signals import post_sync, pre_migrate

from .management import admin_auto_register


class AdminConfig(AppConfig):
    name = 'orun.contrib.admin'
    verbose_name = 'Basic Admin Module'
    version = '0.1'
    auto_install = True
    fixtures = ['homepage.xml', 'templates.xml']
    js_templates = [
        'static/admin/katrid/templates.html',
    ]
    dependencies = ['orun.contrib.auth', 'orun.contrib.contenttypes']
    urls_module = 'orun.contrib.admin.urls'

    def ready(self):
        pass
        # pre_migrate.connect(inject_rename_contenttypes_operations, sender=self)
        # post_sync.connect(admin_auto_register)
        # checks.register(check_generic_foreign_keys, checks.Tags.models)
        # checks.register(check_model_name_lengths, checks.Tags.models)
