import os
from io import BytesIO
import hashlib
from orun import app, g
from orun.conf import settings
from orun.db import models, connection
from orun.utils.translation import gettext_lazy as _
from orun.core.files.storage import get_storage_class


class Attachment(models.Model):
    TYPE = (
        ('url', 'URL'),
        ('file', _('File')),
    )
    name = models.CharField(label=_('Attachment Name'), null=False)
    file_name = models.CharField(label=_('File Name'))
    description = models.TextField(label=_('Description'))
    model = models.CharField(128, label=_('Model'))
    field = models.CharField(128)
    object_name = models.CharField()
    object_id = models.BigIntegerField()
    company = models.ForeignKey('res.company')
    attachment_type = models.SelectionField(TYPE, default='file')
    url = models.URLField()
    is_public = models.BooleanField(default=False)
    content = models.BinaryField(getter='get_content', setter='set_content')
    db_content = models.BinaryField()
    stored_file_name = models.CharField(label=_('Stored Filename'))
    file_size = models.BigIntegerField()
    checksum = models.CharField(40, db_index=True)
    mimetype = models.CharField(128, 'Mime Type', readonly=True)
    indexed_content = models.TextField(deferred=True, readonly=True)
    download_url = models.CharField(getter='get_download_url')

    class Meta:
        name = 'ir.attachment'
        title_field = 'file_name'
        index_together = (('model', 'object_id'),)

    @property
    def storage(self):
        storage_cls = app['ir.config.parameter'].get_param('ir.attachment.storage')
        if storage_cls == 'db':
            return None
        return get_storage_class(storage_cls)(
            os.path.join(settings.MEDIA_ROOT, 'files', g.DEFAULT_DB_ALIAS, self.prefix)
        )

    def get_content(self):
        storage = self.storage
        if storage is None:
            return self.db_content
        else:
            return storage.open(self.stored_file_name)

    def set_content(self, value):
        if isinstance(value, bytes):
            v = value
            value = BytesIO(value)
        else:
            v = value.read()
        checksum = hashlib.sha1(v or b'').hexdigest()
        self.checksum = checksum
        storage = self.storage
        if storage is None:
            # store directly on db_content field
            self.stored_file_name = None
            self.db_content = v
        else:
            self.file_size = len(v)
            self.stored_file_name = (storage.store_file_name and checksum) or None
            if not storage.exists(checksum):
                storage.save(checksum, value)

    def get_download_url(self):
        return '/web/content/%s/?download' % self.pk

    @property
    def prefix(self):
        return self.checksum[:2]
