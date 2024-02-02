import traceback

from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Automation(models.Model):
    description = models.CharField()
    type = models.SelectionField(
        {
            'startup': 'Startup',
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
        },
    )
    action = models.ForeignKey('ui.action.server')
    code = models.TextField()

    class Meta:
        name = 'admin.automation'
        name_field = 'description'

    @classmethod
    def setup(cls):
        cls._setup()

    @classmethod
    def _setup(cls):
        for obj in cls.objects.filter(active=True):
            obj.start()

    def start(self):
        if self.type == 'startup':
            if self.code:
                try:
                    exec(self.code)
                except Exception as e:
                    traceback.print_exc()

        # todo load signal and trigger
