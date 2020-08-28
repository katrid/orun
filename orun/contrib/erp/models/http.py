from orun.http import HttpResponse
from orun.apps import apps
from orun.db import models


class Http(models.Model):
    @classmethod
    def get_attachment(cls, attachment_id):
        obj = apps['content.attachment'].get(attachment_id)
        headers = None
        res = HttpResponse(obj.content, content_type=obj.mimetype)
        if obj.file_name:
            res['Content-Disposition'] = 'attachment; filename=' + obj.file_name
        return res

    class Meta:
        name = 'ir.http'
