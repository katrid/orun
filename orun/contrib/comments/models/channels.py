from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Channel(models.Model):
    name = models.CharField(256, null=False)
    channel_type = models.SelectionField(
        (
            ('chat', _('Chat Discussion')),
            ('channel', _('Channel')),
        ),
        default='channel',
    )
    description = models.TextField()
    email_send = models.BooleanField()
    public = models.SelectionField(
        (
            ('public', _('Everyone')),
            ('private', _('Invited people only')),
            ('groups', _('Selected group of users')),
        )
    )
    groups = models.ManyToManyField('auth.group')
    alias = models.ForeignKey('mail.alias')

    class Meta:
        name = 'mail.channel'


class ChannelPartner(models.Model):
    partner = models.ForeignKey('res.partner')
    channel = models.ForeignKey('mail.channel')
    seen_message = models.ForeignKey('mail.message')
    fold_state = models.SelectionField(
        (
            ('open', _('Open')),
            ('folded', _('Folded')),
            ('closed', _('Closed')),
        )
    )
    is_minimized = models.BooleanField()
    is_pinned = models.BooleanField(default=True)

    class Meta:
        name = 'mail.channel.partner'
        title_field = 'partner'
