from orun import g
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Cron(models.Model):
    INTERVAL_TYPE = (
        ('minute', _('Minutes')),
        ('hour', _('Hours')),
        ('work_day', _('Work Days')),
        ('day', _('Days')),
        ('week', _('Weeks')),
        ('month', _('Months')),
    )
    name = models.CharField(256, null=False)
    action = models.ForeignKey('ir.action')
    user = models.ForeignKey('auth.user', default=lambda x: g.user, null=False)
    active = models.BooleanField(default=True)
    interval_type = models.SelectionField(INTERVAL_TYPE, default='month')
    interval = models.PositiveIntegerField()
    limit = models.IntegerField(default=1)
    repeat_missed = models.BooleanField(default=False)
    next_call = models.DateTimeField()
    args = models.TextField()
    priority = models.IntegerField(default=5)

    class Meta:
        name = 'ir.cron'
        ordering = ('priority', 'id')
