from orun import apps
from orun.db.models.signals import post_migrate
from orun.utils.translation import gettext_lazy as _

from .management import create_default_site


class AppConfig(apps.AppConfig):
    name = 'orun.contrib.sites'
    verbose_name = _("Sites")

    def ready(self):
        post_migrate.connect(create_default_site, sender=self)
