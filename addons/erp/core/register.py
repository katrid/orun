from typing import Protocol

from core.models.content import ContentObject


class Registrable(Protocol):
    def deconstruct(self) -> dict:
        """
        Return the information required to reconstruct this object.

        Returns:
            A dictionary containing the information required to reconstruct this object.
            {
                "name": str,
                "content_type": str,
                "object_id": int,
                "data": dict,
            }
        """

def register_object(obj: Registrable):
    ContentObject.register_object(obj.deconstruct())
