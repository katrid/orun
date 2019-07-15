import orun


class AppConfig(orun.AppConfig):
    name = 'Web'
    version = '0.1'
    auto_install = True
    fixtures = ['templates.xml']
    js_templates = [
        'static/api/1.7/templates.html',
    ]


addon = AppConfig()
