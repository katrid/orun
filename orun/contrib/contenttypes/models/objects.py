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


class Property(models.Model):
    name = models.CharField(128, _('name'), null=False)
    company = models.ForeignKey('res.company', null=False)
    field = models.ForeignKey('content.field', on_delete=models.CASCADE, null=False)

    float_value = models.FloatField()
    int_value = models.BigIntegerField()
    text_value = models.TextField()
    binary_value = models.BinaryField()
    ref_value = models.CharField(1024)
    datetime_value = models.DateTimeField()

    prop_type = models.CharField(
        (
            ('char', 'Char'),
            ('float', 'Float'),
            ('boolean', 'Boolean'),
            ('integer', 'Integer'),
            ('text', 'Text'),
            ('binary', 'Binary'),
            ('foreignkey', 'Foreign Key'),
            ('date', 'Date'),
            ('datetime', 'Date Time'),
            ('choices', 'Choices'),
        ), null=False, default='foreignkey',
    )

    class Meta:
        name = 'content.property'


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
    no_update = False

    def __init_subclass__(cls, **kwargs):
        module = cls.__module__
        app_config = apps.get_containing_app_config(module)
        if app_config:
            cls.schema = app_config.schema

    @classmethod
    def _register_object(cls, model, obj_name: str, info: dict, using=DEFAULT_DB_ALIAS):
        try:
            obj_id = Object.objects.get(name=obj_name)
            if cls.no_update != obj_id.can_update:
                obj_id.can_update = cls.no_update
                obj_id.save(using=using)
            instance = obj_id.content_object
            if instance is None:
                answer = input('The object "%s" is defined but not found on module "%s". Do you want to recreate it? [Y/n]' % (obj_name, obj_id.model_name))
                if answer == 'y' or not answer:
                    obj_id.delete()
                    raise Object.DoesNotExist
            if cls.no_update:
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
                can_update=not cls.no_update,
            )
        return instance

    @classmethod
    def get_qualname(cls):
        return f'{cls.__module__}.{cls.__qualname__}'


