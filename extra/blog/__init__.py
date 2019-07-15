import orun


class AppConfig(orun.AppConfig):
    name = 'Blog'
    version = '0.1'
    auto_install = False
    installable = True
    fixtures = []
    #demo = ['demo.json']
    dependencies = ['base']


addon = AppConfig()
