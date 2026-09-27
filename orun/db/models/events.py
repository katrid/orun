from orun.events import Event
from .base import Model


class ModelEvent(Event):
    sender: Model | None
    model: type[Model]

    async def dispatch(self, sender: Model | None) -> None:
        self.sender = sender
        await super().dispatch()


class MigrationEvent(Event):
    created_models: list[type[Model]]

    async def dispatch(self, created_models: list[type[Model]]) -> None:
        self.created_models = created_models
        await super().dispatch()


post_migrate = MigrationEvent('orun.models.post_migrate')
