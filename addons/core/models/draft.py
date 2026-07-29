from orun.db import models
from orun.contrib.contenttypes.models import ContentType


class Draft(models.Model):
    status = models.ChoiceField(
        {
            'draft': 'Draft',
            'error': 'Error',
            'converted': 'Converted',
            'discard': 'Discarded',
        }, default='draft',
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.DB_CASCADE, null=False)
    user = models.ForeignKey('auth.user', on_delete=models.DB_CASCADE, null=False)
    public = models.BooleanField(default=True, help_text='All users with content creation permission can view this draft')
    client_id = models.CharField(max_length=255, help_text='Client side unique identifier for the draft', db_index=True)
    content = models.TextField()

    class Meta:
        name = 'content.draft'
        db_table = '"core"."content_draft"'
        db_schema = 'core'


# class ContentMark(models.Model):
#     name = models.CharField()
#     color = models.IntegerField()
#
#     class Meta:
#         name = 'content.mark'


class ContentTemplate(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.DB_CASCADE, null=False)
    user = models.ForeignKey('auth.user', on_delete=models.DB_CASCADE, null=False)
    public = models.BooleanField(default=True, help_text='All users with content creation permission can view this template')
    content = models.TextField()

    class Meta:
        name = 'content.template'
