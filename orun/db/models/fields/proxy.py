"""
Field-like classes that aren't really fields. It's easier to use objects that
have the same attributes as fields sometimes (avoids a lot of special casing).
"""

from typing import List

from orun.utils.functional import cached_property
from orun.db.models import fields
from .mixins import FieldCacheMixin


class ProxyField(FieldCacheMixin, fields.Field):
    _fk_field = None
    _proxy_path: List[fields.Field] = None
    _queryset = None

    def __init__(self, proxy, *args, **kwargs):
        kwargs.setdefault('concrete', False)
        self.proxy = proxy
        kwargs['descriptor'] = ProxyDescriptor(self)
        super().__init__(*args, **kwargs)

    @cached_property
    def proxy_field(self):
        field: fields.Field = None
        fk_field = None
        parent = self.model
        self._proxy_path = []
        # resolve the field path
        for s in self.proxy.split('.'):
            if not fk_field:
                fk_field = parent._meta.fields[s]
                self._fk_field = fk_field
            field = parent._meta.fields[s]
            if field.many_to_one:
                parent = field.remote_field.model
            self._proxy_path.append(field)
        self._fk_field = fk_field
        _, _, _, kwargs = field.deconstruct()
        kwargs.pop('verbose_name', None)
        for k, v in kwargs.items():
            setattr(self, k, v)
        return field

    def db_type_parameters(self, connection):
        return self.proxy_field.db_type_parameters(connection)

    def db_type(self, connection):
        return self.proxy_field.db_type(connection)

    def get_internal_type(self):
        return self.proxy_field.get_internal_type()

    def rel_db_type(self, connection):
        return self.proxy_field.rel_db_type(connection)

    def cast_db_type(self, connection):
        return self.proxy_field.cast_db_type(connection)

    def db_parameters(self, connection):
        return self.proxy_field.db_parameters(connection)

    def get_db_converters(self, connection):
        return self.proxy_field.get_db_converters(connection)

    def get_cache_name(self):
        return self.name


class ProxyDescriptor:
    def __init__(self, field):
        self.field: ProxyField = field

    def __get__(self, instance, owner):
        if instance is None:
            return self

        proxy_field = self.field.proxy_field
        fk_field = self.field._fk_field
        rel_obj = None
        try:
            rel_obj = self.field.get_cached_value(instance)
        except KeyError:
            rel_obj = getattr(instance, fk_field.attname)
            filter_path = self.field._proxy_path
            if rel_obj is not None:
                if len(filter_path) > 2:
                    path = '__'.join(f.name for f in filter_path[1:-1])
                    rel_obj = fk_field.remote_field.model.objects.only('pk', filter_path[1].attname).prefetch_related(path).get(pk=rel_obj)
                    for f in filter_path[1:]:
                        rel_obj = getattr(rel_obj, f.name, None)
                        if rel_obj is None:
                            return
                else:
                    rel_obj = getattr(instance, fk_field.name)
                    rel_obj = getattr(rel_obj, filter_path[-1].name)
        return rel_obj


class OrderWrt(fields.IntegerField):
    """
    A proxy for the _order database field that is used when
    Meta.order_with_respect_to is specified.
    """

    def __init__(self, *args, **kwargs):
        kwargs['name'] = '_order'
        kwargs['editable'] = False
        super().__init__(*args, **kwargs)

