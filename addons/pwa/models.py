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
        for k, v in values.items():
            if isinstance(v, list):
                field = model._meta.fields[k]
                if field.one_to_many:
                    new_val = []
                    for obj in v:
                        new_val.append({'action': 'CREATE', 'values': {k: v for k, v in obj.items() if not k.startswith('$')}})
                    values[k] = new_val
        return model.write(values)
