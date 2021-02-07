from typing import Optional, List
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
    smtp_encryption = models.ChoiceField(
        (
            ('none', _('None')),
            ('tls', _('TLS')),
            ('ssl', _('SSL/TLS')),
        ), default='none',
    )
    smtp_debug = models.BooleanField(default=False)

    class Meta:
        name = 'mail.server'


class Channel(models.Model):
    name = models.CharField(null=False, unique=True)
    channel_type = models.SelectionField(
        (
            ('chat', 'Chat'),
            ('channel', 'Channel'),
        ), default='channel', label=_('Channel Type'),
    )
    description = models.TextField()
    access = models.SelectionField(
        (
            ('public', 'Everyone'),
            ('private', 'Invited people only'),
            ('groups', 'Selected groups of users')
        ), default='groups',
    )
    partners = models.ManyToManyField('res.partner')
    groups = models.ManyToManyField('auth.group', label=_('Groups'))
    moderate = models.BooleanField()

    class Meta:
        name = 'mail.channel'

    def send_to_partner(self, partner, message: str, subject: Optional[str]=None, attachments: Optional[List]=None):
        pass
