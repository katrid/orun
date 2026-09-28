from orun.db.models.base import Model, ModelBase
from orun.db.models.fields import Field


class Relation:
    model: type[Model] | None
    field: Field
    to: type[Model] | str | Field
    related_name: str | None = None

    def __init__(self, field: Field, to: type[Model] | str | Field, related_name):
        self.field = field
        self.to = to
        if isinstance(to, Field):
            self.model = to.model
        elif isinstance(to, ModelBase):
            self.model = to
        else:
            self.model = None
        self.related_name = related_name
