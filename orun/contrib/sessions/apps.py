from orun.apps import AppConfig
from orun.utils.translation import gettext_lazy as _


class SessionsConfig(AppConfig):
    name = 'orun.contrib.sessions'
    verbose_name = _("Sessions")
