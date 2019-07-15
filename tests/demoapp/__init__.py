import orun


class AppConfig(orun.AppConfig):
    name = 'Demo App'
    version = '0.1'
    fixtures = [
        'actions.xml', 'menu.xml'
    ]
    dependencies = ['mail']


addon = AppConfig()
