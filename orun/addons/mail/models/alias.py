from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Alias(models.Model):
    name = models.CharField(256, label=_('Name'))
    alias_model = models.ForeignKey('ir.model')
    alias_contact = models.SelectionField(
        (
            ('everyone', _('Everyone')),
            ('partners', _('Partners')),
            ('followers', _('Followers')),
        )
    )

    class Meta:
        name = 'mail.alias'
