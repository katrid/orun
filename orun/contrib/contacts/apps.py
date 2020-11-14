from orun.apps import AppConfig


class ContactsConfig(AppConfig):
    name = 'orun.contrib.contacts'
    verbose_name = 'Contacts Module'
    version = '0.1'
    auto_install = False
    installable = True
    fixtures = ['actions.xml', 'menu.xml']
    dependencies = ['orun.contrib.admin']
