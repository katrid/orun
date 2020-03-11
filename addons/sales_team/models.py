from orun.db import models
from orun.utils.translation import gettext_lazy as _
import base.models


class User(base.models.User):
    user_sales_team = models.ForeignKey('sales.team', verbose_name=_("User's Sales Team"))

    class Meta:
        override = True


class Partner(base.models.Partner):
    sales_team = models.ForeignKey('sales.team', verbose_name=_('Sales Team'))


class Team(models.Model):
    name = models.CharField(100, verbose_name=_('Name'))
    active = models.BooleanField(verbose_name=_('Active'), default=True)
    company = models.ForeignKey('res.company')
    # currency = models.ForeignKey('res.currency')
    user = models.ForeignKey('auth.user', verbose_name=_('Team Leader'))
    members = models.OneToManyField('auth.user', 'sale_team')
    favorite_users = models.ManyToManyField('auth.user')
    color = models.IntegerField()
    team_type = models.ChoiceField(
        (
            ('sales', _('Sales')),
            ('website', _('Website')),
        ), default='sales', null=False, verbose_name=_('Team Type'),
    )

    class Meta:
        name = 'sales.team'
        verbose_name = _('Sales Team')
        verbose_name_plural = _('Sales Teams')
