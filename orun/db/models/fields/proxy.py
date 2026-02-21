from typing import Optional

from orun.utils.functional import cached_property
from orun.db.models.fields import Field, IntegerField, NOT_PROVIDED
from orun.db.models.query_utils import FieldCacheMixin


class ProxyDescriptor(FieldCacheMixin):
    def __init__(self, field):
        self.field = field

    def get_cache_name(self):
        return '_' + self.field.name

    def __get__(self, instance, owner):
        if instance is None:
            return self.field
        try:
            return self.get_cached_value(instance)
        except KeyError:
            # if cached value is not available then calculate the field value
            # Load remote field value
            obj = instance
            val = None
            for f in self.field.field_path:
                val = getattr(obj, f.name)
                if f.many_to_one:
                    obj = val
            self.set_cached_value(instance, val)
            return val

    def __set__(self, instance, value):
        if instance is not None:
            self.set_cached_value(instance, value)


class ProxyField(Field):
    """
    ProxyField instance represents a remote field in a foreign key field path
    :param remote_field:
        field1.field2.field3.target_field
    """
    def __init__(self, remote_field: str, **kwargs):
        kwargs.setdefault('concrete', False)
        super().__init__(**kwargs, descriptor=ProxyDescriptor(self))
        self._field_path = remote_field.split('.')
        self.path = remote_field

    @cached_property
    def field_path(self):
        res = []
        model = self.model
        for f in self._field_path:
            f = model._meta.fields[f]
            if f.many_to_one:
                model = f.related_model
            res.append(f)
        return res

    @property
    def target_field(self):
        return self.field_path[-1]

    def db_type(self, connection) -> Optional[str]:
        return self.target_field.db_type(connection)

    def get_type(self):
        return self.target_field.get_type()

    def _formfield(self):
        info = self.target_field._formfield()
        info['readonly'] = self.readonly
        info['caption'] = self.label
        return info
