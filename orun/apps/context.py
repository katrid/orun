from typing import TYPE_CHECKING, Optional

import orun
from orun.utils.functional import SimpleLazyObject
if TYPE_CHECKING:
    from .registry import Registry
    from orun.db.models.base import ModelBase


class Environment:
    old_env = None

    def __init__(self, registry: 'Registry', **kwargs):
        if orun.env is None:
            orun.env = self
        self._registry = registry
        self.user_id = kwargs.get('user_id')
        self.user = SimpleLazyObject(lambda: self._registry.models['auth.user'].objects.get(self.user_id))
        self.request = kwargs.get('request')
        self.context = kwargs

    def __iter__(self):
        return self._registry.models

    def __getitem__(self, item) -> 'ModelBase':
        return self._registry.models[item]

    def __call__(self, **kwargs):
        ctx = self.context.copy()
        ctx.update(kwargs)
        return self.__class__(self._registry, **ctx)

    def ref(self, name):
        return self._registry.models['ir.object'].get_object(name).object_id

    def __enter__(self):
        self.old_env = getattr(self._registry._local_env, 'env', None)
        self._registry._local_env.env = self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._registry._local_env.env = self.old_env
