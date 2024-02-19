from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Sequence(models.Model):
    name = models.CharField(verbose_name=_('Name'), null=False)
    code = models.CharField(verbose_name=_('Sequence Code'))
    company = models.ForeignKey('res.company', default=lambda self: self.env.company_id)
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
        self.update(next_id=self.next_id + self.step, current_id=self.next_id)
        if self.code:
            return self.code.format(current_id=self.current_id, next_id=self.next_id)


class SequenceDateRange(models.Model):
    sequence = models.ForeignKey(Sequence, null=False, on_delete=models.CASCADE)
    date_from = models.DateField(null=False)
    date_to = models.DateField(null=False)
    next_id = models.BigIntegerField()
    current_id = models.BigIntegerField()

    class Meta:
        name = 'ir.sequence.date.range'
