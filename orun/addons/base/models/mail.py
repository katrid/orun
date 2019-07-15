from orun.db import models
from orun.utils.translation import gettext_lazy as _


class MailServer(models.Model):
    name = models.CharField(128, null=False, unique=True)
    active = models.BooleanField(default=True, label=_('Active'))
    sequence = models.IntegerField()
    smtp_host = models.CharField(null=False)
    smtp_port = models.IntegerField(null=False, default=25)
    smtp_user = models.CharField(64)
    smtp_pwd = models.CharField(64)
    smtp_encryption = models.SelectionField(
        (
            ('none', _('None')),
            ('tls', _('TLS')),
            ('ssl', _('SSL/TLS')),
        )
    )
    smtp_debug = models.BooleanField(default=False)

    class Meta:
        name = 'ir.mail.server'
