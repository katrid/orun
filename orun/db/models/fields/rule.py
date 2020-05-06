from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Rule(models.Model):
    name = models.CharField(128, verbose_name=_('object name'), null=False)
    active = models.BooleanField(default=True)
    content_type = models.ForeignKey('ir.model', null=False, db_index=True, on_delete=models.DB_CASCADE)
    groups = models.ManyToManyField('auth.group')
    domain = models.TextField()

    class Meta:
        name = 'ir.rule'
