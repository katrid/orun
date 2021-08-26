import base64
from orun.db import models
from orun.utils.translation import gettext_lazy as _

from .partner import Partner


class UserCompany(models.Model):
    user = models.ForeignKey('auth.user')
    company = models.ForeignKey('res.company')

    class Meta:
        name = 'auth.user.company'


class Company(Partner):
    PAPER_SIZE = (
        ('A4', 'A4'),
        ('LETTER', 'Letter'),
    )
    currency = models.ForeignKey('res.currency')
    report_header = models.TextField()
    report_footer = models.TextField()
    report_paper = models.SelectionField(PAPER_SIZE, default='A4')
    # company_logo = models.BinaryField()
    #users = models.ManyToManyField('auth.user', through=UserCompany)

    class Meta:
        name_field = 'name'
        name = 'res.company'
        verbose_name = _('Company')
        verbose_name_plural = _('Companies')

    @property
    def base64_logo(self):
        if self.image:
            att = self.env['content.attachment'].objects.get(self.image.decode('utf-8'))
            return f'data:{att.mimetype};base64,' + base64.encodebytes(att.content.read()).decode('utf-8')
