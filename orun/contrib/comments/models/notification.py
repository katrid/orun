from orun import api
from orun.db import models
from orun.utils.translation import gettext_lazy as _

from orun.http import HttpRequest


class Notification(models.Model):
    mail_message = models.ForeignKey('mail.message', null=False, db_index=True)
    notification_type = models.SelectionField(
        {'inbox': _('Inbox'), 'email': _('Email')},
        default='inbox', null=False, db_index=True,
    )
    partner = models.ForeignKey('res.partner', null=False, db_index=True)
    is_read = models.BooleanField(label=_('Is Read'), db_index=True, default=False)
    notification_status = models.SelectionField(
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

    @api.classmethod
    def get_unread_count(cls, request: HttpRequest, notification_type='inbox'):
        user_id = int(request.user_id)
        return {
            'count': cls.objects.filter(
                partner_id=user_id, is_read=False, notification_type=notification_type
            ).count()
        }

    @api.classmethod
    def get_unread_notifications(cls, request: HttpRequest, notification_type='inbox'):
        user_id = int(request.user_id)
        # todo group by thread
        return [
            n.mail_message.get_message_summary()
            for n in cls.objects.filter(
                partner_id=user_id, is_read=False, notification_type=notification_type
            )
        ]
