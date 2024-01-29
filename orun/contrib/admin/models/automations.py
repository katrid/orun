from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Automation(models.Model):
    type = models.SelectionField(
        {
            'signal': 'Signal',
            'trigger': 'Trigger',
        }, default='trigger',
    )
    signal_name = models.CharField('Signal Name')
    model = models.ForeignKey('content.type', on_delete=models.DB_CASCADE)
    active = models.BooleanField(default=True)
    trigger = models.SelectionField(
        {
            'insert': _('On creation'),
            'update': _('On update'),
            'delete': _('On deletion'),
        }, null=False,
    )
    action = models.ForeignKey('ui.action.server')

    class Meta:
        name = 'admin.automation'
