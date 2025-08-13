import importlib.util
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
            'change': _('On UI change'),
        },
    )
    before_update_filter = models.TextField()
    after_update_filter = models.TextField()
    when_updating = models.TextField()
    action = models.ForeignKey('ui.action.server')
    code = models.TextField()

    class Meta:
        name = 'admin.automation'
        name_field = 'description'
        field_groups = {
            'list_fields': ['description', 'type', 'signal_name', 'trigger', 'model', 'active'],
        }

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
                    spec = importlib.util.spec_from_loader(f'orun.contrib.admin.automations.__dynmod{self.pk}', loader=None)
                    module = importlib.util.module_from_spec(spec)
                    exec(self.code, module.__dict__)
                except Exception as e:
                    traceback.print_exc()

        # todo load signal and trigger
