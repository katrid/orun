from orun.apps import AppConfig


class MailConfig(AppConfig):
    name = 'orun.contrib.mail'
    verbose_name = 'Basic ERP Module'
    auto_install = True
    default_language = 'en-us'
    fixtures = ['mail.xml']
    dependencies = ['orun.contrib.admin']
