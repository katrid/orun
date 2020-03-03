from orun import addons


class Addon(addons.Addon):
    name = 'web'
    description = 'Web Module'
    version = '0.1'
    auto_install = True
    fixtures = ['templates.xml']
    js_templates = [
        'static/katrid/templates.html',
    ]
