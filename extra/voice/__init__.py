import orun


class AppConfig(orun.AppConfig):
    name = 'Voice Command'
    version = '0.1'
    fixtures = ['actions.xml', 'menu.xml']
    auto_install = False

addon = AppConfig()
