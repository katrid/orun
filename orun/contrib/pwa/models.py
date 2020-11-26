from orun.db import models
from orun.apps import apps


class PwaSync(models.Model):
    uuid = models.CharField(64, db_index=True)
    object_id = models.BigIntegerField()

    class Meta:
        name = 'pwa.sync'

    @classmethod
    def sync(cls, service: str, values: dict):
        model = apps[service]
        return model.write(values)
