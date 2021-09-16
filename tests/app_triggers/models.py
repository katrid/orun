from orun.db import models


class Partner(models.Model):
    name = models.CharField(null=False)
