from orun.apps import AppConfig


class PwaConfig(AppConfig):
    name = 'orun.contrib.pwa'
    version = '0.1'
    auto_install = False
    installable = True
    #fixtures = ['actions.xml', 'menu.xml']
    #demo = ['demo.json']


