from orun.apps.config import AppConfig


class MailModuleTest(AppConfig):
    label = 'mail_module_test'
    dependencies = ['mail']


addon = MailModuleTest()
