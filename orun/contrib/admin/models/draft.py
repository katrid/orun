from orun.http import HttpRequest, JsonResponse
from orun.db import models
from orun.contrib.contenttypes.models import ContentType
from .base import AdminModel


class Draft(AdminModel):
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

    class Admin(AdminModel.Admin):
        @classmethod
        def sync_draft(cls, request: HttpRequest, client_id: str, content_type: str, content: str, public: bool = True):
            content_type = ContentType.objects.get(name=content_type)
            draft, _ = Draft.objects.update_or_create(
                client_id=client_id, user_id=int(request.user_id),
                defaults={'content_type': content_type, 'content': content, 'public': public},
            )
            return JsonResponse({'id': draft.id})



class ContentTemplate(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.DB_CASCADE, null=False)
    user = models.ForeignKey('auth.user', on_delete=models.DB_CASCADE, null=False)
    public = models.BooleanField(default=True, help_text='All users with content creation permission can view this template')
    content = models.TextField()

    class Meta:
        name = 'content.template'
