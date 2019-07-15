from orun.db import models
from orun.utils.translation import gettext_lazy as _

from base.fields import GenericForeignKey
from .model import Model


class Object(models.Model):
    name = models.CharField(128, _('Object Name'), null=False)
    model = models.CharField(128, null=False)
    object_id = models.BigIntegerField()
    object = GenericForeignKey()
    app_label = models.CharField(64, null=False)
    can_update = models.BooleanField(default=True)

    class Meta:
        name = 'ir.object'
        index_together = (('model', 'object_id'),)

    def get_object(self, name):
        return self.objects.filter(self.c.name == name).one()

    def get_by_natural_key(self, name):
        return self.get_object(name)

    def get_by_object_id(self, model, object_id):
        return self.objects.filter(self.c.model == model, self.c.object_id == object_id).first()


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

    prop_type = models.CharField(16, null=False, default='foreignkey', choices=(
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
    ))

    class Meta:
        name = 'ir.property'


class Association(models.Model):
    source_content = models.ForeignKey('ir.model')
    source_id = models.BigIntegerField()
    # source_object = GenericForeignKey('source_content', 'source_id')
    target_content = models.ForeignKey('ir.model')
    target_id = models.BigIntegerField()
    # target_object = GenericForeignKey('target_content', 'target_id')
    comment = models.TextField()

    class Meta:
        name = 'ir.association'
