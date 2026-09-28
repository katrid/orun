from orun.db import models
from orun.db.models.fields.generic import GenericForeignKey


OWNER_TYPES = {
    'system': 'System',
    'user': 'User',
}


class ContentModel(models.Model):
    model_ids = {}

    """Store registered content models."""

    name = models.CharField(255, null=False, unique=True)
    module_name = models.CharField(255, null=False)
    label = models.CharField(255, null=False)
    description = models.TextField()
    owner_type = models.ChoiceField(OWNER_TYPES, default='user')
    schema_name = models.CharField(255)
    table_name = models.CharField(255, null=False)

    class Meta:
        name = 'content.model'

    @classmethod
    def register_model(cls, model: type[models.Model]):
        if not cls.objects.filter(name=model._meta.name).exists():
            cls.objects.create(
                name=model._meta.name,
                module_name=model._meta.addon.name,
                label=model._meta.verbose_name,
                description=model._meta.verbose_name_plural,
                owner_type='system',
                schema_name=model._meta.db_schema,
                table_name=model._meta.tablename,
            )


class ContentObject(models.Model):
    """Store registered content objects."""

    name = models.CharField(255, db_index=True)
    model_name = models.CharField(references=ContentModel.name, null=False)
    object_id = models.BigIntegerField()
    object = GenericForeignKey('model_name', 'object_id')

    class Meta:
        name = 'content.object'


def refresh_model_cache():
    try:
        ContentModel.model_ids = {model[0]: model[1] for model in ContentModel.objects.only('name', 'id').values_list('name', 'id')}
    except:
        # table maybe doesn't exist
        ContentModel.model_ids = {}
