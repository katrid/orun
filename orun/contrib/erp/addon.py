import orun.addons


class Addon(orun.addons.Addon):
    name = 'base'
    verbose_name = 'ERP Basic Module'
    auto_install = True
    default_language = 'en-us'
    fixtures = ['modules.xml', 'views.xml', 'actions.xml', 'menu.xml', 'currency.xml', 'country.xml', 'partner.xml']
    dependencies = []
