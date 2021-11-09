from .models import ContentType, ContentTypeManager
from .objects import Object, ObjectManager, Association, Registrable
from .attachment import Attachment


def ref(key: str):
    obj = Object.objects.filter(name=key).only('object_id').first()
    if not obj:
        raise Object.DoesNotExist(f'Object not found "{key}"')
    return obj.object_id
