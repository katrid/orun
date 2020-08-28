from orun.apps import AppConfig
from orun.utils.translation import gettext_lazy as _


class MessagesConfig(AppConfig):
    name = 'orun.contrib.messages'
    verbose_name = _("Messages")
