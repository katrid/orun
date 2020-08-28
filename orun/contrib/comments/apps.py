from orun.apps import AppConfig
from orun.utils.translation import gettext_lazy as _


class CommentsConfig(AppConfig):
    name = 'orun.contrib.comments'
    verbose_name = _('Discuss')
    category = _('Communication')
    version = '0.1'
    auto_install = False
    installable = True
    application = True
    fixtures = ['mail.xml', 'views.xml', 'actions.xml', 'menu.xml']
    dependencies = ['orun.contrib.admin']
