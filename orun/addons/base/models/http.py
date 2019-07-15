from orun import app
from orun.db import models


class Http(models.Model):
    def get_attachment(self, attachment_id):
        obj = self.env['ir.attachment'].get(attachment_id)
        headers = None
        if obj.file_name:
            headers = {'Content-Disposition': 'attachment; filename=' + obj.file_name}
        return app.response_class(obj.content, content_type=obj.mimetype, headers=headers)

    class Meta:
        name = 'ir.http'
