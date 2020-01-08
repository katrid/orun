from orun.db import models
from base.fields import GenericOneToManyField
from orun import g, api


class Comments(models.Model):
    message_followers = GenericOneToManyField('mail.followers', editable=False, copy=False)
    messages = GenericOneToManyField('mail.message', editable=False, copy=False)

    @api.method
    def post_message(self, ids, content=None, **kwargs):
        Message = self.env['mail.message']
        Attachment = self.env['ir.attachment']
        attachments = kwargs.get('attachments')
        if attachments:
            attachments = [Attachment.objects.get(id) for id in attachments]
        for id in ids:
            yield Message.create(
                author=g.user_id,
                content=content,
                model=self._meta.name,
                object_id=id,
                message_type='comment',
                attachments=attachments,
            ).get_message()

    class Meta:
        abstract = True
