from orun import addons
from orun.utils.translation import gettext_lazy as _


class Addon(addons.Addon):
    name = 'orun.contrib.sessions'
    verbose_name = _("Sessions")
