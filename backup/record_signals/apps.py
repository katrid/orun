from orun.apps import AppConfig


class MyAppConfig(AppConfig):
    name = 'record_signals'
    dependencies = ['orun.contrib.erp']
