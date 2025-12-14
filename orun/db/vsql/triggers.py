import inspect

from orun.db import models


def create_agg_triggers(field: models.Field):
    field_path = field.aggregate
    if isinstance(field_path, str):
        field_path = field_path.split('.')
    m = field.model
    fields = []
    for f in field_path:
        rel_field = m._meta.fields[f]
        if isinstance(rel_field, models.ForeignKey):
            m = rel_field.remote_field.model
        fields.append(rel_field)
    agg_field = fields[-1]
    if isinstance(agg_field, (models.IntegerField, models.DecimalField, models.DecimalField)):
        # generate the trigger arithmetic code
        return {
            '__after_insert': f"""    @trigger
    def __after_insert(self, new):
        Update('{fields[-2].remote_field.model._meta.name}').set({agg_field.column}={agg_field.column} + new.{field.column}).where(id=new.{fields[0].column})
""",
            '__after_update': f"""    @trigger
    def __after_update(self, old, new):
        Update('{fields[-2].remote_field.model._meta.name}').set({agg_field.column}={agg_field.column} - old.{field.column}).where(id=old.{fields[0].column})
        Update('{fields[-2].remote_field.model._meta.name}').set({agg_field.column}={agg_field.column} + new.{field.column}).where(id=new.{fields[0].column})
""",
            '__after_delete': f"""    @trigger
    def __after_delete(self, old, new):
        Update('{fields[-2].remote_field.model._meta.name}').set({agg_field.column}={agg_field.column} - old.{field.column}).where(id=old.{fields[0].column})
"""
    }




class TriggerCollector(list):
    pass


class Trigger:
    """Translate python code to a representation of sql native trigger"""

    def __init__(self, fn, *args, **kwargs):
        self.fn = fn
        self.name = fn.__name__

    def contribute_to_class(self, cls, name):
        cls._meta.triggers.add(self)

    def get_source(self):
        return inspect.getsource(self.fn)


class BeforeInsert(Trigger):
    pass


class AfterInsert(Trigger):
    pass


class BeforeUpdate(Trigger):
    pass


class AfterUpdate(Trigger):
    pass


class BeforeDelete(Trigger):
    pass


class AfterDelete(Trigger):
    pass


class Triggers:
    def __init__(self):
        self.triggers: list[Trigger] = []
        self.before_insert = TriggerCollector()
        self.after_insert = TriggerCollector()
        self.before_update = TriggerCollector()
        self.after_update = TriggerCollector()
        self.before_delete = TriggerCollector()
        self.after_delete = TriggerCollector()

    def add(self, trigger):
        cls = type(trigger)
        self.triggers.append(trigger)
        if cls is BeforeInsert:
            self.before_insert.append(trigger)
        elif cls is AfterInsert:
            self.after_insert.append(trigger)
        elif cls is BeforeUpdate:
            self.before_update.append(trigger)
        elif cls is AfterUpdate:
            self.after_update.append(trigger)
        elif cls is BeforeDelete:
            self.before_delete.append(trigger)
        elif cls is AfterDelete:
            self.after_delete.append(trigger)


class AggregationTrigger:
    def __init__(self, field_path):
        self.field_path = field_path
        self.agg_field = field_path[-1]


class Trigger:
    def __init__(self, *args, **kwargs):
        print(args, kwargs)

