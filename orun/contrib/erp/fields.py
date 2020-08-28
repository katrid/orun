from orun.db.models import ForeignKey, BooleanField
from orun.utils.translation import gettext_lazy as _


class CompanyField(ForeignKey):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('label', _('Company'))
        kwargs.setdefault('default', lambda self: self.env.company)
        kwargs.setdefault('null', False)
        super().__init__('res.company', *args, **kwargs)


class ActiveField(BooleanField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('label', _('Active'))
        kwargs.setdefault('default', True)
        super().__init__(*args, **kwargs)
