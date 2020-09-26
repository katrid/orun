import datetime
from orun.db import models
from orun.utils.translation import gettext_lazy as _
from orun import api


class Subtype(models.Model):
    name = models.CharField(128)
    sequence = models.IntegerField()
    description = models.TextField()
    internal = models.BooleanField(default=True)
    parent = models.ForeignKey('self')
    rel_field = models.CharField(128)
    model = models.CharField(128)
    default = models.BooleanField(default=True)

    class Meta:
        name = 'mail.message.subtype'


class Message(models.Model):
    subject = models.CharField()
    date_time = models.DateTimeField(default=datetime.datetime.now)
    content = models.HtmlField()
    parent = models.ForeignKey('self')
    model = models.CharField(128)
    object_id = models.BigIntegerField()
    object_name = models.CharField()
    message_type = models.SelectionField(
        (
            ('email', _('Email')),
            ('comment', _('Comment')),
            ('notification', _('Notification')),
        ),
        default='email', null=False,
    )
    subtype = models.ForeignKey(Subtype, db_index=True)
    email_from = models.EmailField()
    author = models.ForeignKey('res.partner', db_index=True)
    partners = models.ManyToManyField('res.partner')
    need_action_partners = models.ManyToManyField('res.partner')
    channels = models.ManyToManyField('mail.channel')
    notifications = models.OneToManyField('mail.notification', 'mail_message')
    message_id = models.CharField('Message-Id')
    reply_to = models.CharField('Reply-To')
    # mail_server = models.ForeignKey('ir.mail.server')
    attachments =  models.ManyToManyField('content.attachment')
    via = models.CharField()

    class Meta:
        name = 'mail.message'
        ordering = '-pk'
        index_together = (('model', 'object_id'),)

    def get_message(self):
        return {
            'id': self.pk,
            'content': self.content,
            'email_from': self.email_from,
            'author_id': self.author_id,
            'author_name': self.author.name,
            'date_time': self.date_time,
            'message_type': self.message_type,
            'object_id': self.object_id,
            'object_name': self.object_name,
            'attachments': [{'id': f.pk, 'name': f.file_name, 'mimetype': f.mimetype} for f in self.attachments],
        }

    @api.method
    def get_messages(cls, ids, *args, **kwargs):
        # TODO fix
        return {}
        for r in ids:
            r = cls.objects.get(pk=r)
            yield r.get_message()


class Confirmation(models.Model):
    message = models.ForeignKey(Message, null=False)
    confirmation_message = models.ForeignKey(Message)
    active = models.BooleanField(default=True)
    confirmed = models.BooleanField(default=False)
    confirmation_type = models.CharField(db_index=True)
    data = models.CharField()
    expiration = models.DateTimeField()

    class Meta:
        name = 'mail.confirmation'

    def confirm(self, message=None, data=None):
        if self.active:
            self.confirmation_message = message
            self.active = False
            self.data = data
            self.save()
