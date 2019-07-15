from orun.db import models
from orun.utils.translation import gettext_lazy as _
from mail.models import Comments


class AllControls(Comments):
    """
    Model for testing UI fields and controls.
    """
    FIELD_CHOICES = (
        ('1', 'First Choice'),
        ('2', 'Second Choice'),
    )
    # regular fields
    char_field = models.CharField(10)
    char_with_def_val = models.CharField(10)
    int_field = models.IntegerField()
    positive_int_field = models.PositiveIntegerField(label=_('Positive Integer Field'))
    int_with_def_val = models.IntegerField(default=0)
    bool_field = models.BooleanField(label=_('Boolean Field'))
    sel_field = models.SelectionField(FIELD_CHOICES)
    date_field = models.DateField()
    datetime_field = models.DateTimeField()
    time_field = models.TimeField()
    text_field = models.TextField()
    html_field = models.HtmlField()
    xml_field = models.XmlField()
    # required fields
    req_char_field = models.CharField(10, null=False)
    # readonly fields
    ro_char_field = models.CharField(10, readonly=True)
    ro_int_field = models.IntegerField(readonly=True)
    ro_bool_field = models.BooleanField(label=_('Boolean Field'), readonly=True)
    ro_sel_field = models.SelectionField(FIELD_CHOICES, readonly=True)
    ro_date_field = models.DateField(readonly=True)
    ro_datetime_field = models.DateTimeField(readonly=True)
    ro_time_field = models.TimeField(readonly=True)
    ro_text_field = models.TextField(readonly=True)
    ro_html_field = models.HtmlField(readonly=True)
    ro_xml_field = models.XmlField(readonly=True)

    class Meta:
        name = 'demoapp.all.controls'


####################
# Dashboard models #
####################


class Product(models.Model):
    """
    Simple product model
    """
    name = models.CharField(100)

    class Meta:
        name = 'demoapp.bi.product'


class Sales(models.Model):
    """
    Sales model
    """
    month = models.IntegerField()
    year = models.IntegerField()
    country = models.ForeignKey('res.country')
    seller = models.ForeignKey('res.partner')
    product = models.ForeignKey(Product)
    value = models.DecimalField()

    class Meta:
        name = 'demoapp.bi.sales'

