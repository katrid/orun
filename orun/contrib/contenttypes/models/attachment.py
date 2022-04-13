import warnings
import os
from io import BytesIO
import hashlib
from orun.apps import apps
from orun.conf import settings
from orun.db import models, DEFAULT_DB_ALIAS
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
    # company = models.ForeignKey('res.company')
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
        name = 'content.attachment'
        title_field = 'file_name'
        index_together = (('model', 'object_id'),)

    @property
    def storage(self):
        storage_cls = getattr(settings, 'ATTACHMENT_FILE_STORAGE', 'db')
        if storage_cls == 'db':
            return None
        try:
            return get_storage_class(storage_cls)(os.path.join(settings.MEDIA_ROOT, 'files', self.prefix))
        except:
            warnings.warn('Invalid attachment filename')

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
            self.stored_file_name = (storage.store_filename and checksum) or None
            if not storage.exists(checksum):
                storage.save(checksum, value)

    def get_download_url(self):
        return '/web/content/%s/?download' % self.pk

    @property
    def prefix(self):
        if self.checksum:
            return self.checksum[:2]

    @classmethod
    def copy_attachments(cls, source, dest):
        attachments = cls.objects.filter(model=source._meta.name, field=None, object_id=source.pk)
        for obj in attachments:
            obj.copy_to(dest)

    def copy_to(self, dest):
        self.__class__.objects.create(
            model=dest._meta.name, object_id=dest.pk, name=self.name, file_name=self.file_name, checksum=self.checksum,
            attachment_type=self.attachment_type,
            stored_file_name=self.stored_file_name, file_size=self.file_size, mimetype=self.mimetype,
        )
