import orun.addons


class Addon(orun.addons.Addon):
    version = '0.1'
    installable = True
    name = 'sales_team'
    verbose_name = 'Sales Team'
    dependencies = ['mail']
