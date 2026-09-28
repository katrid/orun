from orun.db import models
from orun.db.models.fields.generic import GenericForeignKey


class ModelWithGeneric(models.Model):
    model_name = models.CharField(max_length=100)
    object_id = models.BigIntegerField()
    ref_object = GenericForeignKey('model_name', 'object_id')
    
    class Meta:
        log_changes = False


class ModelA(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        log_changes = False


class ModelB(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        log_changes = False
