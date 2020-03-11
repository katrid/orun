from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Notification(models.Model):
    mail_message = models.ForeignKey('mail.message', null=False, db_index=True)
    partner = models.ForeignKey('res.partner', null=False, db_index=True)
    is_read = models.BooleanField(label=_('Is Read'), db_index=True)
    is_email = models.BooleanField(label=_('Sent by Email'), db_index=True)
    email_status = models.SelectionField(
        (
            ('ready', _('Ready to Send')),
            ('sent', _('Sent')),
            ('bounce', _('Bounced')),
            ('exception', _('Exception')),
        ),
        default='ready', db_index=True,
    )

    class Meta:
        name = 'mail.notification'
