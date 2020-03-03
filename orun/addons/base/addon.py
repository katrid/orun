from orun import addons


class Addon(addons.Addon):
    name = 'base'
    verbose_name = 'Basic Orun Module'
    auto_install = True
    default_language = 'en-us'
    fixtures = ['modules.xml', 'views.xml', 'actions.xml', 'menu.xml', 'currency.xml', 'country.xml', 'partner.xml']
    dependencies = []
