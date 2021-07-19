from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Country(models.Model):
    name = models.CharField(128, _('Name'), translate=True, null=False)
    code = models.CharField(2, _('Country Code'))
    phone_code = models.PositiveSmallIntegerField()
    image_flag = models.CharField(256)
    currency = models.ForeignKey('res.currency')
    language = models.ForeignKey('res.language')
    address_format = models.TextField(_('Address Format'))

    class Meta:
        name = 'res.country'
        verbose_name = _('Country')
        verbose_name_plural = _('Countries')


class CountryGroup(models.Model):
    name = models.CharField(128, _('name'), null=False)
    countries = models.ManyToManyField(Country)

    class Meta:
        name = 'res.country.group'


class CountryState(models.Model):
    country = models.ForeignKey(Country, null=False)
    name = models.CharField(64, _('name'), null=False)
    code = models.CharField(3, _('State Code'), null=False)

    class Meta:
        name = 'res.country.state'
        verbose_name = _('State')
        verbose_name_plural = _('States')


class City(models.Model):
    state = models.ForeignKey(CountryState, label=_('State'), null=False)
    name = models.CharField(64, label=_('Name'), db_index=True)

    class Meta:
        ordering = 'name'
        name = 'res.city'
        verbose_name = _('City')
        verbose_name_plural = _('Cities')

    def __str__(self):
        return '%s - %s' % (self.name, str(self.state.code))


class Language(models.Model):
    name = models.CharField(128, _('name'), null=False)
    code = models.CharField(16, _('Locale Code'))
    iso_code = models.CharField(16, _('ISO Code'))
    active = models.BooleanField(default=True)

    class Meta:
        name = 'res.language'


class Currency(models.Model):
    name = models.CharField(3, _('currency'), null=False)
    symbol = models.CharField(4, _('symbol'))
    rounding = models.FloatField(_('Rounding Factor'))
    active = models.BooleanField(default=True)
    decimal_places = models.SmallIntegerField()
    is_crypto = models.BooleanField(default=False)
    description = models.CharField(64)

    class Meta:
        name = 'res.currency'
