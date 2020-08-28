from orun import api
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class DecimalPrecision(models.Model):
    name = models.CharField(_('Usage'), null=False, db_index=True, unique=True)
    digits = models.PositiveIntegerField(_('Digits'), default=2)

    class Meta:
        name = 'decimal.precision'

    @api.method
    def get_precision(self, application):
        try:
            dec = self.objects.get(name=application)
            return dec.digits or 2
        except models.ObjectDoesNotExist:
            return 2
