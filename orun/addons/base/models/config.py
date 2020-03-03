import uuid
import datetime
from orun.apps import apps
from orun.db import models


_default_parameters = {
    "secret_key": lambda: uuid.uuid4().hex,
    "database.uuid": lambda: uuid.uuid1().hex,
    "database.created": lambda: datetime.datetime.now(),
}


class Config(models.Model):
    key = models.CharField(256, null=False, db_index=True)
    value = models.TextField()

    class Meta:
        title_field = 'key'
        name = 'ir.config.parameter'

    def init(self):
        for k, v in _default_parameters.items():
            self.set_param(k, v())

    @classmethod
    def get_param(cls, key, default=None):
        obj = cls.objects.filter(key=key).first()
        return (obj and obj.value) or default

    def set_param(self, key, value):
        obj = self.objects.filter(key=key).first()
        if obj is None:
            self.create(key=key, value=value)
        else:
            obj.value = value
            obj.save()
