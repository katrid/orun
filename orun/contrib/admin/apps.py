from orun.apps import AppConfig


class AdminConfig(AppConfig):
    name = 'orun.contrib.admin'
    verbose_name = 'Basic Admin Module'
    version = '0.1'
    auto_install = True
    fixtures = ['templates.xml']
    js_templates = [
        'static/admin/katrid/templates.html',
    ]
    dependencies = ['orun.contrib.auth', 'orun.contrib.contenttypes']
