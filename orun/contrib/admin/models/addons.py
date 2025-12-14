import hashlib

from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Fixtures(models.Model):
    """
    Loaded fixtures registry
    """
    name = models.CharField(label=_('Fixture Name'), null=False, help_text='Name of the fixture file in the form of app_name:fixture_name')
    checksum = models.CharField(64, null=False, help_text='SHA256 hash of the fixture file')

    class Meta:
        name = 'ir.fixture'
        unique_together = (('name', 'schema'),)
        log_changes = False
        
    def after_loaded(self, content: str | bytes):
        h = hashlib.sha256()
        if isinstance(content, str):
            content = content.encode('utf-8')
        h.update(content)
        self.update(checksum=h.hexdigest())
        
    def modified(self, content: str | bytes) -> bool:
        h = hashlib.sha256()
        if isinstance(content, str):
            content = content.encode('utf-8')
        h.update(content)
        return h.hexdigest() != self.checksum
