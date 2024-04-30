from orun.db import models


class Resource(models.Model):
    name = models.CharField()
    type = models.CharField()

    class Meta:
        name = 'erp.resource'
