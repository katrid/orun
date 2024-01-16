from orun.apps import apps
from orun.db import models, DEFAULT_DB_ALIAS
from orun.utils.translation import gettext_lazy as _

from orun.contrib.contenttypes.fields import GenericForeignKey
from .models import ContentType


class ObjectManager(models.Manager):
    def get_by_natural_key(self, name, using=None):
        try:
            return self.using(using).get(name=name)
        except models.ObjectDoesNotExist:
            raise self.model.DoesNotExist('Object "%s" does not exist.' % name)

    get_object = get_by_natural_key

    def get_by_object_id(self, model, object_id):
        return self.filter(name=model, object_id=object_id).first()

    def register_object(self, name: str, schema: str, obj):
        from .models import ContentType
        return self.create(
            name=name, model=ContentType.objects.get_for_model(type(obj)), model_name=obj._meta.name, object_id=obj.pk,
            schema=schema,
        )


class Object(models.Model):
    name = models.CharField(label=_('Object Name'), null=False)
    model = models.ForeignKey(ContentType, null=False)
    model_name = models.CharField(null=False)
    object_id = models.BigIntegerField()
    content_object = GenericForeignKey()
    schema = models.CharField(null=False)
    can_update = models.BooleanField(default=True)

    objects = ObjectManager()

    class Meta:
        name = 'ir.object'
        index_together = (('model', 'object_id'),)
        log_changes = False

    def save(self, *args, **kwargs):
        self.model_name = self.model._meta.name
        super().save(*args, **kwargs)

    @classmethod
    def get_object(cls, name):
        return cls.objects.get(name=name)

    @classmethod
    def get_by_natural_key(cls, name):
        return cls.get_object(name)

    @classmethod
    def get_ref(cls, ref_id: str):
        return cls.objects.get(name=ref_id).object_id


class Association(models.Model):
    source_model = models.ForeignKey(ContentType, null=False)
    source_model_name = models.CharField(proxy='source_model.name')
    source_id = models.BigIntegerField()
    source_object = GenericForeignKey('source_model', 'source_id')
    dest_model = models.ForeignKey(ContentType, null=False)
    dest_model_name = models.CharField(proxy='dest_model.name')
    dest_id = models.BigIntegerField()
    dest_object = GenericForeignKey('dest_model', 'target_id')
    comment = models.TextField()

    class Meta:
        name = 'content.association'


class Registrable:
    schema: str = None
    can_update = True

    def __init_subclass__(cls, **kwargs):
        module = cls.__module__
        app_config = apps.get_containing_app_config(module)
        if app_config:
            cls.schema = app_config.schema

    @classmethod
    def _register_object(cls, model, obj_name: str, info: dict, using=DEFAULT_DB_ALIAS):
        try:
            obj_id = Object.objects.get(name=obj_name)
            if cls.can_update != obj_id.can_update:
                obj_id.can_update = cls.can_update
                obj_id.save(using=using)
            instance = obj_id.content_object
            if instance is None:
                answer = input('The object "%s" is defined but not found on module "%s". Do you want to recreate it? [Y/n]' % (obj_name, obj_id.model_name))
                if answer == 'y' or not answer:
                    obj_id.delete()
                    raise Object.DoesNotExist
            if not cls.can_update:
                return instance
        except Object.DoesNotExist:
            obj_id = None
            instance = model()

        for k, v in info.items():
            field = instance._meta.fields.get(k)
            if field:
                k = field.attname
            setattr(instance, k, v)
        instance.save(using=using)

        if not obj_id:
            Object.objects.create(
                schema=cls.schema,
                name=obj_name,
                object_id=instance.pk,
                model=ContentType.objects.get_by_natural_key(instance._meta.name),
                model_name=instance._meta.name,
                can_update=not cls.can_update,
            )
        return instance
    
    @classmethod
    def get_object(cls):
        """Return related model instance"""
        obj = apps['ir.object'].get_by_natural_key(cls.get_qualname())
        return obj.content_object

    @classmethod
    def get_id(cls):
        """Return id from database"""
        obj = cls.get_object()
        return obj.pk

    @classmethod
    def get_qualname(cls):
        return f'{cls.__module__}.{cls.__qualname__}'

    @classmethod
    def update_info(cls):
        pass

    @classmethod
    def delete_object(cls, object_id):
        Object = apps['ir.object']
        try:
            obj = Object.objects.get_object(object_id)
            content = obj.content_object
            content.delete()
            obj.delete()
        except:
            pass
