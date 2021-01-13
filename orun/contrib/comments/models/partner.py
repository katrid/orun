from orun.db import models
import orun.contrib.erp.models


class Partner(orun.contrib.erp.models.Partner):
    class Meta:
        override = True

