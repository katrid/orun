from orun.db import models


class Follower(models.Model):
    model = models.CharField(128)
    object_id = models.BigIntegerField()
    partner = models.ForeignKey('res.partner')
    channel = models.ForeignKey('mail.channel')
    subtypes = models.ManyToManyField('mail.message.subtype')

    class Meta:
        name = 'mail.followers'
        index_together = (('model', 'object_id'),)
