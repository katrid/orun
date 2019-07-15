from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Bank(models.Model):
    name = models.CharField(null=False)
    code = models.CharField(label=_('Bank Identifier Code'), help_text=_('BIC or Swift Code'))
    active = models.BooleanField()
    street = models.CharField()
    street2 = models.CharField()
    zip = models.CharField()
    city = models.CharField()
    country = models.ForeignKey('res.country')
    state = models.ForeignKey('res.country.state', label=_('Fed. State'), domain="{'country': country}")
    email = models.EmailField()
    phone = models.CharField()
    fax = models.CharField()

    class Meta:
        name = 'res.bank'


class PartnerBank(models.Model):
    acc_number = models.CharField(label=_('Account Number'))
    bank = models.ForeignKey(Bank, null=False)
    partner = models.ForeignKey('res.partner', label=_('Account Holder'), null=False)
    sequence = models.IntegerField()
    currency = models.ForeignKey('res.currency')
    company = models.ForeignKey('res.company', on_delete=models.CASCADE)

    class Meta:
        name = 'res.partner.bank'
