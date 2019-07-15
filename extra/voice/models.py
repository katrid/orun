from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Command(models.Model):
    name = models.CharField(label=_('name'))
    command = models.TextField(label='Javascript Command')

    class Meta:
        name = 'voice.command'
