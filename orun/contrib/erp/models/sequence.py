from orun.db import models
from orun.utils.translation import gettext_lazy as _
from orun.contrib.erp import current_company_id


class Sequence(models.Model):
    name = models.CharField(label=_('Name'), null=False)
    code = models.CharField(label=_('Sequence Code'))
    company = models.ForeignKey('res.company')
    implementation = models.CharField(16, choices=(
        ('standard', _('Standard')),
        ('no gap', _('No gap')),
    ))
    active = models.BooleanField(default=True)
    prefix = models.CharField(trim=False)
    suffix = models.CharField(trim=False)
    next_id = models.BigIntegerField()
    current_id = models.BigIntegerField()
    step = models.IntegerField(default=1, null=False)
    size = models.IntegerField(default=0, null=False)
    use_date_range = models.BooleanField(default=False)

    class Meta:
        name = 'ir.sequence'
        ordering = ('name',)
        
    def get_next(self):
        self.update(next_id=(self.next_id or 0) + self.step, current_id=self.next_id or self.step)
        if self.code:
            return self.code.format(current_id=self.current_id, next_id=self.next_id)
        return self.current_id


class SequenceDateRange(models.Model):
    sequence = models.ForeignKey(Sequence, null=False, on_delete=models.CASCADE)
    date_from = models.DateField(null=False)
    date_to = models.DateField(null=False)
    next_id = models.BigIntegerField()
    current_id = models.BigIntegerField()

    class Meta:
        name = 'ir.sequence.date.range'
