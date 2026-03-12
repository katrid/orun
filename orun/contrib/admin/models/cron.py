import datetime
from dateutil.relativedelta import relativedelta
import traceback
import asyncio
import json

from orun.db import models
from orun.contrib import auth
from orun.contrib.admin.jobs import JobManager, JobItem
from orun.utils.translation import gettext_lazy as _


INTERVAL_TYPES = {
    'days': lambda interval: relativedelta(days=interval),
    'hours': lambda interval: relativedelta(hours=interval),
    'weeks': lambda interval: relativedelta(days=7 * interval),
    'months': lambda interval: relativedelta(months=interval),
    'minutes': lambda interval: relativedelta(minutes=interval),
}


class Cron(models.Model):
    INTERVAL_TYPE = {
        'days': _('Days'),
        'hours': _('Hours'),
        'weeks': _('Weeks'),
        'months': _('Months'),
        'minutes': _('Minutes'),
    }
    job_type = models.ChoiceField(
        {
            'report': _('Send Report'),
            'action': _('Action'),
        },
        default='report',
    )
    action = models.ForeignKey('ui.action.server')
    report = models.ForeignKey('ui.action.report')
    default_report_format = models.ChoiceField({'pdf': 'PDF', 'md': 'Markdown', 'html': 'HTML'}, default='pdf')
    name = models.CharField(256, null=False)
    user = models.ForeignKey('auth.user')
    active = models.BooleanField(default=True)
    interval_type = models.SelectionField(INTERVAL_TYPE, default='month', label=_('Interval Type'),)
    interval = models.PositiveIntegerField(help_text='Repeat every x.', default=1, label=_('Interval'))
    limit = models.IntegerField(default=1, help_text='Number of times the method will be called,\na negative number indicates no limit.')
    repeat_missed = models.BooleanField(default=False, help_text='Repeat missed occurrences where the server restarts.')
    next_call = models.DateTimeField(label='Next Execution', required=True, default=datetime.datetime.now, help_text='Next planned execution datetime for this job.')
    last_call = models.DateTimeField(label='Last Execution', required=False, null=True, help_text='Last execution datetime for this job.')
    priority = models.IntegerField(default=5, help_text='Job priority: 0 higher priority; 10 lower priority.')
    # report destination
    groups = models.ManyToManyField('auth.group', help_text='Groups to receive the report')
    users = models.ManyToManyField('auth.user', help_text='Users to receive the report')
    params = models.TextField()  # TODO implement channels

    class Meta:
        name = 'admin.cron'
        ordering = ('priority', 'id')

    def get_interval(self):
        return INTERVAL_TYPES[self.interval_type](self.interval)

    def _callback(self):
        if self.job_type == 'report':
            params = self.params and self.params.strip()
            if params.startswith('{'):
                params = json.loads(params)
            if 'telegram_ids' in params:
                self.report.send_to(params['telegram_ids'])
        else:
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

    @classmethod
    def process_all(cls):
        """
        Process all cron jobs that are due for execution.
        """
        now = datetime.datetime.now()
        for cron in cls.objects.filter(active=True, next_call__lte=now).order_by('priority', 'id'):
            try:
                cron.process()
            except Exception as e:
                # Log the error or handle it as needed
                print(f"Error processing cron job {cron.id}: {e}")
                traceback.format_exc()

    @staticmethod
    async def setup_loop():
        while True:
            Cron.process_all()
            await asyncio.sleep(3600)
