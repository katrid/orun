import asyncio

from orun.core import checks
from orun.apps import AppConfig
from orun.db.models.signals import post_sync, pre_migrate
from orun.dispatch import Signal

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
    dependencies = ['orun.contrib.auth']
    urls_module = 'orun.contrib.admin.urls'

    def ready(self):
        from orun.conf import settings
        super().ready()
        # load automations
        if getattr(settings, 'ADMIN_AUTOMATIONS', False):
            from .models import Automation
            Automation.setup()
        # startup signal
        system_startup.send(self)

    def register_object(self, name: str, obj):
        from orun.contrib.contenttypes.models import Object
        return Object.objects.register_object(name, self.schema, obj)

    def register_group(self, obj_name, group_name):
        from orun.contrib.contenttypes.models import Object
        from orun.contrib.auth.models import Group
        if (obj := Object.objects.filter(name=obj_name).first()) is None:
            return self.register_object(obj_name, Group.objects.create(name=group_name))
        return obj

    def load_fixtures(self, **options):
        super().load_fixtures(**options)
        self.register_group('group_admin', 'System Administrator')
        self.register_group('group_manager', 'Manager')


system_startup = Signal()
