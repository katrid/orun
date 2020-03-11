from orun import api
from orun.apps import apps
from orun.db import models
from orun.contrib.contenttypes.fields import GenericRelation


class Comments(models.Model):
    message_followers = GenericRelation('mail.followers', editable=False, copy=False)
    messages = GenericRelation('mail.message', editable=False, copy=False)

    @api.method
    def post_message(cls, ids, content=None, **kwargs):
        Message = apps['mail.message']
        for id in ids:
            msg = Message.objects.create(
                author_id=cls.env.user_id,
                content=content,
                content_type=cls._meta.name,
                object_id=id,
                message_type='comment',
            )
            attachments = kwargs.get('attachments')
            if attachments:
                msg.attachments.set(attachments)
            yield msg.get_message()

    class Meta:
        abstract = True
