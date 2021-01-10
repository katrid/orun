from orun.db import models
from orun.core.validators import MinLengthValidator, MinValueValidator, MaxValueValidator
from orun.utils.translation import gettext_lazy as _


class Widgets(models.Model):
    name = models.CharField()
    string_field = models.CharField(100, verbose_name=_('String Field'))
    integer_field = models.IntegerField()
    fk_field = models.ForeignKey('admin_tests.partner')
    choice_field = models.ChoiceField(
        {
            '1': 'Option One',
            '2': 'Option Two',
            '3': 'Option Three',
            '4': 'Option Four',
            '5': 'Option Five',
        }
    )
    positive_integer = models.PositiveIntegerField()
    date_field = models.DateField()
    datetime_field = models.DateTimeField()
    time_field = models.TimeField()
    text_field = models.TextField()
    html_field = models.HtmlField()
    color_field = models.PositiveIntegerField(widget='color-selector')
    grid_field = models.ForeignKey('admin_tests.grid')
    tags_field = models.ManyToManyField('admin_tests.tag')

    # mandatory fields
    string_field_nn = models.CharField(100, null=False)
    integer_field_nn = models.IntegerField(null=False)
    fk_field_nn = models.ForeignKey('admin_tests.partner', null=False)
    choice_field_nn = models.ChoiceField(('one', 'two', 'three'), null=False)
    date_field_nn = models.DateField(null=False)
    datetime_field_nn = models.DateTimeField(null=False)
    time_field_nn = models.TimeField(null=False)
    text_field_nn = models.TextField(null=False)
    tags_field_nn = models.ManyToManyField('admin_tests.tag', null=False)

    # validation fields
    string_field_val = models.CharField(100, validators=[MinLengthValidator(4)])
    integer_field_val = models.IntegerField(validators=[MinValueValidator(9, 100)])


class Partner(models.Model):
    name = models.CharField(null=False)
    widgets = models.OneToManyField(Widgets)


class Grid(models.Model):
    full_widgets = models.ForeignKey(Widgets, null=False)


class Tag(models.Model):
    name = models.CharField()
    color = models.IntegerField(widget='color-selector')
