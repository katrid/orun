import datetime
from dateutil.relativedelta import relativedelta

from orun.db import models
from orun.contrib import auth
from orun.utils.translation import gettext_lazy as _


INTERVAL_TYPES = {
    'days': lambda interval: relativedelta(days=interval),
    'hours': lambda interval: relativedelta(hours=interval),
    'weeks': lambda interval: relativedelta(days=7 * interval),
    'months': lambda interval: relativedelta(months=interval),
    'minutes': lambda interval: relativedelta(minutes=interval),
}


class Cron(models.Model):
    INTERVAL_TYPE = (
        ('days', _('Days')),
        ('hours', _('Hours')),
        ('weeks', _('Weeks')),
        ('months', _('Months')),
        ('minutes', _('Minutes')),
    )
    action = models.ForeignKey('ui.action')
    name = models.CharField(256, null=False)
    user = models.ForeignKey('auth.user', default=auth.current_user, null=False)
    active = models.BooleanField(default=True)
    interval_type = models.SelectionField(INTERVAL_TYPE, default='month')
    interval = models.PositiveIntegerField(help_text='Repeat every x.')
    limit = models.IntegerField(default=1, help_text='Number of times the method will be called,\na negative number indicates no limite.')
    repeat_missed = models.BooleanField(default=False, help_text='Repeat missed occurrences where the server restarts.')
    next_call = models.DateTimeField(label='Next Execution', required=True, default=datetime.datetime.now(), help_text='Next planned execution datetime for this job.')
    priority = models.IntegerField(default=5, help_text='Job priority: 0 higher priority; 10 lower priority.')

    class Meta:
        name = 'ir.cron'
        ordering = ('priority', 'id')
