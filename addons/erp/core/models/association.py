from typing import Self

from orun.db import models
from .content import ContentModel


class Association(models.Model):
    """Associate two objects"""

    source_model = models.ForeignKey('content.model')
    source_id = models.BigIntegerField()
    target_model = models.ForeignKey('content.model')
    target_id = models.BigIntegerField()
    link_event = models.CharField(255)
    description = models.TextField()
    parent = models.ForeignKey(
        Self,
        on_delete=models.DB_CASCADE,
    )

    class Meta:
        name = 'content.association'
        log_changes = False

    @classmethod
    def link(
        cls,
        source: models.Model,
        target: models.Model,
        *,
        link_event: str | None = 'link',
        description: str | None = None,
        parent: Self | None = None,
    ):
        source_model_id = ContentModel.model_ids[source._meta.name]
        source_id = source.pk
        target_model_id = ContentModel.model_ids[target._meta.name]
        target_id = target.pk
        if obj := Association.objects.filter(
            source_model_id=source_model_id, source_id=source_id, target_model_id=target_model_id, target_id=target_id
        ).first():
            return obj
        return Association.objects.create(
            source_model_id=source_model_id,
            source_id=source_id,
            target_model_id=target_model_id,
            target_id=target_id,
            link_event=link_event,
            description=description,
            parent=parent,
        )

    @classmethod
    def unlink(cls, source: models.Model, target: models.Model, link_event: str | None):
        if link_event is None:
            Association.objects.filter(
                source_model_id=ContentModel.model_ids[source._meta.name],
                source_id=source.pk,
                target_model_id=ContentModel.model_ids[target._meta.name],
                target_id=target.pk,
            ).delete()
        else:
            Association.objects.filter(
                source_model_id=ContentModel.model_ids[source._meta.name],
                source_id=source.pk,
                target_model_id=ContentModel.model_ids[target._meta.name],
                target_id=target.pk,
                link_event=link_event,
            ).delete()
