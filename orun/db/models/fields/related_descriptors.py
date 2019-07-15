

class ForeignKeyDescriptor:
    def __init__(self, prop_name, field, prop):
        self.prop_name = prop_name
        self.field = field
        self.prop = prop

    def __get__(self, instance, owner):
        if instance is None:
            return self.prop
        obj = self.field.get_cached_value(instance, getattr(instance, self.prop_name, None))
        value = getattr(instance, self.field.attname)
        if value is None:
            self.field.set_cached_value(instance, None)
        elif (obj and obj.pk is not None and str(obj.pk) != str(value)) or not obj:
            obj = self.field.rel.model.objects.get(value)
            self.field.set_cached_value(instance, obj)
        return obj

    def __set__(self, instance, value):
        if instance is not None:
            self.field.delete_cached_value(instance)
            if value is None:
                setattr(instance, self.field.attname, None)
            elif isinstance(value, models.Model):
                setattr(instance, self.field.attname, value.pk)
                setattr(instance, self.prop_name, value)
            else:
                setattr(instance, self.field.attname, value)


from orun.db import models
