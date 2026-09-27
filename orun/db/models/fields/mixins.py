from orun.utils.functional import cached_property

NOT_PROVIDED = object()


class FieldCacheMixin:
    """
    An API for working with the model's fields value cache.

    Subclasses must set self.cache_name to a unique entry for the cache -
    typically the field’s name.
    """

    @cached_property
    def cache_name(self):
        raise NotImplementedError

    def get_cached_value(self, instance, default=NOT_PROVIDED):
        try:
            return instance._state.fields_cache[self.cache_name]
        except KeyError:
            if default is NOT_PROVIDED:
                raise
            return default

    def is_cached(self, instance):
        return self.cache_name in instance._state.fields_cache

    def set_cached_value(self, instance, value):
        instance._state.fields_cache[self.cache_name] = value

    def delete_cached_value(self, instance):
        del instance._state.fields_cache[self.cache_name]
