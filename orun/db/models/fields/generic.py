from typing import TYPE_CHECKING

from orun.apps import apps
from orun.db.models import Model
from orun.db.models.fields import Field, DeferredAttribute
from orun.db.models.fields.mixins import FieldCacheMixin
from orun.db.models.fields.relations import Relation
from orun.utils.functional import cached_property


class GenericRelation(Relation):
    one_to_many = True


class GenericDescriptor(DeferredAttribute):
    def get_object(self, instance):
        model = apps.models[getattr(instance, self.field.model_field)]
        return model.objects.get(pk=getattr(instance, self.field.id_field))

    def __get__(self, instance, owner):
        try:
            rel_obj = self.field.get_cached_value(instance)
        except KeyError:
            rel_obj = self.get_object(instance)
            self.field.set_cached_value(instance, rel_obj)
        return rel_obj

    def __set__(self, instance, value):
        if value is None:
            self.field.set_cached_value(instance, None)
        elif isinstance(value, Model):
            self.field.set_cached_value(instance, value)
            setattr(instance, self.field.model_field, value._meta.name)
            setattr(instance, self.field.id_field, value.pk)


class GenericForeignKey(FieldCacheMixin, Field):
    descriptor_class = GenericDescriptor

    def __init__(self, model_field='model_name', id_field='object_id', **kwargs):
        kwargs['concrete'] = False
        super().__init__(**kwargs)
        self.model_field = model_field
        self.id_field = id_field
        self.is_relation = True

    @cached_property
    def cache_name(self):
        return self.name
