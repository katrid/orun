import orun.apps


class AppConfig(orun.apps.AppConfig):
    name = 'admin_tests'
    dependencies = ['orun.contrib.erp']
