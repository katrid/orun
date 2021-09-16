import orun.apps


class AppConfig(orun.apps.AppConfig):
    name = 'dashboard_tests'
    dependencies = ['orun.contrib.admin']
