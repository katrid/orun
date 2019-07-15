from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Sequence(models.Model):
    name = models.CharField(null=False)
    code = models.CharField(verbose_name=_('Sequence Code'))
    company = models.ForeignKey('res.company')
    implementation = models.CharField(16, choices=(
        ('standard', _('Standard')),
        ('no gap', _('No gap')),
    ))
    active = models.BooleanField(default=True)
    prefix = models.CharField()
    suffix = models.CharField()
    next_id = models.BigIntegerField()
    current_id = models.BigIntegerField()
    step = models.IntegerField()
    padding = models.IntegerField()
    use_date_range = models.BooleanField(default=False)

    class Meta:
        name = 'ir.sequence'


class SequenceDateRange(models.Model):
    sequence = models.ForeignKey(Sequence, null=False, on_delete=models.CASCADE)
    date_from = models.DateField(null=False)
    date_to = models.DateField(null=False)
    next_id = models.BigIntegerField()
    current_id = models.BigIntegerField()

    class Meta:
        name = 'ir.sequence.date.range'
