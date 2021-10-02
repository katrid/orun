from .models import ContentType, ContentTypeManager
from .objects import Object, ObjectManager, Association, Registrable
from .attachment import Attachment


def ref(key: str):
    return Object.objects.filter(name=key).only('object_id').first().object_id
