import orun
from orun.utils.translation import gettext_lazy as _


class AppConfig(orun.AppConfig):
    name = _('Discuss')
    category = _('Communication')
    version = '0.1'
    auto_install = False
    installable = True
    application = True
    fixtures = ['mail.xml', 'views.xml', 'actions.xml', 'menu.xml']
    dependencies = ['base']


addon = AppConfig()
