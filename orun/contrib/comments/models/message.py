import datetime
from orun.apps import apps
from orun.db import models
from orun.http import HttpRequest
from orun.utils.translation import gettext_lazy as _
from orun.contrib.auth import current_user_id
from orun import api
from orun.core.handlers.ws import send_to_room


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
    attachments = models.ManyToManyField('content.attachment')

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
            'model': self.model,
            'attachments': [{'id': f.pk, 'name': f.file_name, 'mimetype': f.mimetype} for f in self.attachments],
        }

    def get_message_summary(self):
        return {
            'id': self.pk,
            'content': self.content,
            'author_id': self.author_id,
            'date_time': self.date_time,
            'message_type': self.message_type,
            'object_id': self.object_id,
            'object_name': self.object_name,
            'model': self.model,
        }

    @api.classmethod
    def post_message(cls, model_name, id, content=None, *, user_id=None, **kwargs):
        msg = cls._post_message(model_name, id, content=content, user_id=user_id, **kwargs)
        return msg.get_message()

    @classmethod
    def _post_message(cls, model_name, ref_id, content=None, user_id=None, **kwargs):
        msg = cls.objects.create(
            author_id=user_id or current_user_id(),  # logged in user
            content=content,
            model=model_name,
            object_id=ref_id,
            message_type='comment',
        )
        attachments = kwargs.get('attachments')
        if attachments:
            msg.attachments.set(attachments)
        # TODO set creator as follower
        # send notification message to the creator of the object
        model = apps[model_name]
        if (obj := model.objects.filter(pk=ref_id).first()) and (created_by := getattr(obj, 'created_by_id', None)):
            msg.send_notification(partner_id=created_by)
        return msg

    @api.classmethod
    def get_messages(cls, model_name, id):
        """
        Return comments for the given model and id
        :param model_name:
        :param id:
        :return:
        """
        # TODO it must be specified in the target model
        # TODO rename to get_comments
        return cls.get_comments(model_name, id)

    @classmethod
    def get_comments(cls, model_name, id):
        return {
            'comments': [
                msg.get_message()
                for msg in cls.objects.filter(
                    model=model_name, object_id=id, message_type='comment'
                )
            ]
        }

    @classmethod
    def add_comment(cls, obj: models.Model, content: str, user_id=None):
        if user_id is None:
            user_id = current_user_id()
        return cls.post_message(obj._meta.name, obj.pk, content=content, user_id=user_id)

    @api.classmethod
    def get_unread_messages(cls, request: HttpRequest):
        return cls.objects.filter(
            notifications__partner_id=int(request.user_id),
            notifications__is_read=False
        )

    def send_notification(self, partner_id):
        from .notification import Notification
        notification = Notification.objects.create(
            mail_message=self,
            partner_id=partner_id,
            notification_type='inbox',
            notification_status='ready',
        )
        # send websocket notification
        send_to_room(f"user:{partner_id}", 'message_notification')
        return notification

    @api.classmethod
    def clear_notifications(cls, request: HttpRequest, model, id):
        """
        Clear notifications for the current user
        :param request:
        :return:
        """
        user_id = int(request.user_id)
        from .notification import Notification
        Notification.objects.filter(
            mail_message__model=model, mail_message__object_id=id, partner_id=user_id, is_read=False
        ).update(is_read=True)
        return {'status': 'ok'}


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
