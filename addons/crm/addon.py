import orun.addons


class Addon(orun.addons.Addon):
    version = '0.1'
    installable = True
    name = 'crm'
    verbose_name = 'CRM'
    dependencies = ['sales_team']
