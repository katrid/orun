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
    action = models.ForeignKey('ui.action.server')
    name = models.CharField(256, null=False)
    user = models.ForeignKey('auth.user', default=auth.current_user, null=False)
    active = models.BooleanField(default=True)
    interval_type = models.SelectionField(INTERVAL_TYPE, default='month', label=_('Interval Type'),)
    interval = models.PositiveIntegerField(help_text='Repeat every x.', default=1, label=_('Interval'))
    limit = models.IntegerField(default=1, help_text='Number of times the method will be called,\na negative number indicates no limit.')
    repeat_missed = models.BooleanField(default=False, help_text='Repeat missed occurrences where the server restarts.')
    next_call = models.DateTimeField(label='Next Execution', required=True, default=datetime.datetime.now, help_text='Next planned execution datetime for this job.')
    last_call = models.DateTimeField(label='Last Execution', required=False, null=True, help_text='Last execution datetime for this job.')
    priority = models.IntegerField(default=5, help_text='Job priority: 0 higher priority; 10 lower priority.')

    class Meta:
        name = 'admin.cron'
        ordering = ('priority', 'id')

    def get_interval(self):
        return INTERVAL_TYPES[self.interval_type](self.interval)

    def _callback(self):
        self.action.execute()

    def process(self):
        if not self.active:
            raise ValueError('Cron job is not active.')
        calls_count = 0
        next_call = self.next_call
        now = datetime.datetime.now()
        interval = self.get_interval()
        while next_call <= now:
            next_call += interval
            calls_count += 1

        if calls_count > 0:
            if self.limit != -1:
                calls_count = min(calls_count, self.limit)
            if calls_count and not self.repeat_missed:
                calls_count = 1

        for c in range(calls_count):
            self._callback()

        remaining_calls = self.limit - calls_count if self.limit != -1 else -1
        self.update(last_call=now, next_call=next_call, active=bool(calls_count), limit=remaining_calls)
