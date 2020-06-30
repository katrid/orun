from orun.db import models
from orun.utils.translation import gettext_lazy as _

from orun.contrib.contenttypes.fields import GenericForeignKey
from orun.contrib.contenttypes.models import ContentType


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
    name = models.CharField(verbose_name=_('Object Name'), null=False)
    model = models.ForeignKey('ir.model', null=False)
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


class Property(models.Model):
    name = models.CharField(128, _('name'), null=False)
    company = models.ForeignKey('res.company', null=False)
    field = models.ForeignKey('ir.model.field', on_delete=models.CASCADE, null=False)

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
        name = 'ir.property'


class Association(models.Model):
    source_content = models.ForeignKey(ContentType)
    source_id = models.BigIntegerField()
    source_object = GenericForeignKey('source_content', 'source_id')
    target_content = models.ForeignKey(ContentType)
    target_id = models.BigIntegerField()
    target_object = GenericForeignKey('target_content', 'target_id')
    comment = models.TextField()

    class Meta:
        name = 'ir.association'
