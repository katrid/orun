from orun.db import models
from orun.utils.translation import gettext_lazy as _
from base.models import get_current_user
import calendar.models


class Meeting(calendar.models.Meeting):
    opportunity_id = models.ForeignKey('crm.lead', verbose_name=_('Opportunity'), domain={'type': 'opportunity'})
