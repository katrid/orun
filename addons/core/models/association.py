from orun.db import models


class LinkType:
    description: str


class Association(models.Model):
    """Associate two objects"""

    source_model = models.ForeignKey('core.content.type')
    source_object = models.BigIntegerField()
    target_model = models.ForeignKey('core.content.type')
    target_object = models.BigIntegerField()
    link_type = models.CharField(128)

    class Meta:
        name = 'content.association'
        db_table = '"core"."content_association"'
        db_schema = 'core'
