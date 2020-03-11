from orun.db import models
import orun.contrib.erp.models

from .comment import Comments


class Partner(orun.contrib.erp.models.Partner, Comments):
    class Meta:
        override = True

