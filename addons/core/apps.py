from orun.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'
    db_schema = 'core'
    create_schema = True
