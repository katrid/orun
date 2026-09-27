from orun.db.models.events import MigrationEvent

from erp.core.models import ContentModel


async def create_models(event: MigrationEvent):
    for model in event.created_models:
        ContentModel.register_model(model)
