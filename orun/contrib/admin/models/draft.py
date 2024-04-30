from orun.db import models

from orun.contrib.contenttypes.models import ContentType


class Draft(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.DB_CASCADE, null=False)
    user = models.ForeignKey('auth.user', on_delete=models.DB_CASCADE, null=False)
    content = models.TextField()

    class Meta:
        name = 'admin.draft'
        log_changes = False
