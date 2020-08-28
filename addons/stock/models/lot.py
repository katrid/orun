from orun.db import models
from orun.utils.translation import gettext_lazy as _


class ProductionLot(models.Model):
    name = models.CharField(
        100,
        label=_('Lot/Serial'),
        null=False, help_text=_('Unique Lot/Serial Number'),
        default=lambda self: self.env['ir.sequence'].next_by_code('stock.lot.serial'),
    )
    ref = models.CharField(
        100, label=_('Internal Reference'),
        help_text=_("Internal reference number in case it differs from the manufacturer's lot/serial number")
    )
    product = models.ForeignKey(
        'product.product', label=_('Product'),
        null=False, check_company=True,
        filter=lambda self: self.domain_product_id()
    )
    product_uom = models.ForeignKey('uom.uom', label=_('Unit of Measure'), related='product.uom',  stored=True)
    quants = models.OneToManyField('stock.quant', readonly=True)
    product_qty = models.DecimalField(label=_('Quantity'), getter='get_product_qty')
    description = models.HtmlField(label=_('Description'))
    display_complete = models.BooleanField(getter='get_display_complete')
    company = models.ForeignKey('res.company', label=_('Company'), null=False, stored=True, db_index=True)

    class Meta:
        name = 'stock.production.lot'
        verbose_name = 'Lot/Serial'
