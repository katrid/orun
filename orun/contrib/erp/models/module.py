from orun.db import models
from orun.utils.translation import gettext_lazy as _


class ModuleCategory(models.Model):
    name = models.CharField(null=False)
    sequence = models.IntegerField()
    visible = models.BooleanField(default=True)

    class Meta:
        name = 'ir.module.category'
        verbose_name = _('Module Category')
        verbose_name_plural = _('Module Categories')
        log_changes = False


class Module(models.Model):
    STATES = (
        ('uninstalled', 'Not Installed'),
        ('installed', 'Installed'),
        ('to upgrade', 'To be upgraded'),
        ('to remove', 'To be removed'),
        ('to install', 'To be installed'),
    )

    name = models.CharField(caption='Module Name')
    category = models.ForeignKey(ModuleCategory, null=False)
    verbose_name = models.CharField(caption='Technical Name')
    description = models.TextField()
    html_description = models.TextField()
    website = models.URLField()
    url = models.URLField()
    author = models.CharField()
    installed_version = models.CharField(readonly=True)
    latest_version = models.CharField(readonly=True)
    auto_install = models.BooleanField(readonly=True)
    state = models.SelectionField(STATES, default='uninstalled', db_index=True)
    application = models.BooleanField(caption='Application', readonly=True)
    icon = models.CharField()

    class Meta:
        name = 'ir.module'
        verbose_name = _('Module')
        verbose_name_plural = _('Modules')
        log_changes = False
