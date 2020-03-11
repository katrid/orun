from orun.core.exceptions import ObjectDoesNotExist
from orun.db import models
from orun.utils.translation import gettext_lazy as _
import orun.contrib.contenttypes.models


class ContentType(orun.contrib.contenttypes.models.ContentType):
    object_type = models.ChoiceField(
        (
            ('user', _('User Model')),
            ('base', _('Base Model')),
        ), null=False, default='user', verbose_name=_('Object Type'),
        readonly=True,
    )

    class Meta:
        override = True


class Field(models.Model):
    name = models.CharField(128, null=False, verbose_name=_('Name'), default='x_')
    full_name = models.CharField(256, verbose_name=_('Full Name'))
    data_type = models.ChoiceField()
    model = models.ForeignKey(ContentType, null=False, verbose_name=_('Document Model'), on_delete=models.CASCADE)
    model_name = models.CharField()
    caption = models.TextField(verbose_name=_('Caption'))
    description = models.TextField(verbose_name=_('Description'))
    help_text = models.TextField(verbose_name=_('Help Text'))
    copyable = models.BooleanField(default=False, verbose_name=_('Copyable'))
    required = models.BooleanField(default=False, verbose_name=_('Required'))
    readonly = models.BooleanField(default=False, verbose_name=_('Readonly'))
    index = models.BooleanField(default=False, verbose_name=_('Database Index'))
    max_length = models.PositiveSmallIntegerField(verbose_name=_('Maximum Length'))
    decimal_places = models.PositiveSmallIntegerField(verbose_name=_('Decimal Places'))
    field_type = models.ChoiceField(
        (
            ('user', _('User Field')),
            ('base', _('Base Field')),
        ), verbose_name=_('Field Type')
    )
    domain = models.TextField(verbose_name=_('Limit Choices To'))
    widget = models.CharField()
    templates = models.TextField()
    choices = models.TextField(verbose_name=_('Options List'))
    dependencies = models.TextField()
    compute = models.TextField()
    db_compute = models.TextField()
    store = models.BooleanField(default=True)
    groups = models.ManyToManyField('auth.group')
    translate = models.BooleanField(verbose_name=_('Translate'), help_text=_('Field content must be translated'))

    class Meta:
        name = 'ir.model.field'
        verbose_name = _('Field')
        verbose_name_plural = _('Fields')
        title_field = 'caption'
