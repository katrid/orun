from orun.core.signals import fixture_loaded
from orun.db import models
from orun.utils.translation import gettext_lazy as _
import orun.core.management.commands.loaddata


class Fixtures(models.Model):
    """
    Loaded fixtures registry
    """
    schema = models.CharField(label=_('Schema'), null=False)
    name = models.CharField(label=_('Fixture Name'), null=False,
                            help_text='Name of the fixture file in the form of app_name:fixture_name')
    hashbytes = models.CharField(64, null=False, help_text='SHA256 hash of the fixture file')

    class Meta:
        name = 'admin.fixture'
        unique_together = (('schema', 'name'),)
        log_changes = False

    def after_loaded(self, hashbytes: str):
        self.update(hashbytes=hashbytes)

    @classmethod
    def fixture_modified(cls, addon, name, hashbytes: str) -> bool:
        try:
            obj = cls.objects.get(schema=addon.schema, name=name)
            return hashbytes != obj.hashbytes
        except cls.DoesNotExist:
            return True

    @classmethod
    def fixture_loaded(cls, sender, filename, hashbytes, **kwargs):
        try:
            obj = cls.objects.get(schema=sender.schema, name=filename)
            obj.update(hashbytes=hashbytes)
        except cls.DoesNotExist:
            obj = cls.objects.create(schema=sender.schema, name=filename, hashbytes=hashbytes)
        return obj


orun.core.management.commands.loaddata.fixture_modified = Fixtures.fixture_modified
fixture_loaded.connect(Fixtures.fixture_loaded)
