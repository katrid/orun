from orun.db import models


class ModelA(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        field_groups = {
            'list_fields': ['name'],
        }
