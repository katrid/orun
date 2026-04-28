import datetime

from orun import api
from orun.http import HttpRequest
from orun.db import models
from orun.utils.translation import gettext as _
from .base import admin_change_log

__all__ = ["LogEntry"]


class LogEntry(models.Model):
    """
    Log entries on the internal database logging
    """

    user = models.ForeignKey("auth.user", null=False, db_index=True)
    performed_at = models.DateTimeField(auto_now_add=True)
    details = models.JSONField()
    # action = models.ForeignKey('ui.action')  # optional ui action
    # object_id = models.BigIntegerField()
    # content_type = models.ForeignKey('content.type', on_delete=models.SET_NULL)
    # content_object = models.TextField()
    # change_message = models.TextField()

    class Meta:
        log_changes = False
        name = "admin.log.entry"

    @api.classmethod
    def get_entries(cls, request: HttpRequest):
        entries = cls.objects.filter(user_id=int(request.user_id))
        return {
            'entries': [
                {
                    'timestamp': entry.performed_at,
                    'details': entry.details,
                }
                for entry in entries
            ]
        }



def _log_change(sender, request: HttpRequest, codename, record: models.Model, *args, **kwargs):
    if record._meta.log_changes:
        LogEntry.objects.create(
            user_id=int(request.user_id),
            performed_at=datetime.datetime.now(),
            details={
                "codename": codename,
                "model": record._meta.name,
                "object_id": record.pk,
                "record_name": str(record),
            },
        )


admin_change_log.connect(_log_change)
