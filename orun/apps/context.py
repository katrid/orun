from orun.conf import settings
from orun.utils.functional import SimpleLazyObject


class LazyEnvironment:
    def __init__(self, registry, root):
        self._registry = registry
        self._root_env = root

    def __getattr__(self, item):
        return getattr(self._registry._local_var.get() or self._root_env, item)
        # return getattr(getattr(self._registry._local_ctx, 'env', self._root_env), item, None)

    def __call__(self, **kwargs):
        return self._root_env(**kwargs)


class Environment:
    _old_env = None

    def __init__(self, registry, **kwargs):
        self._registry = registry
        self._context = kwargs
        self.request = kwargs.get('request')

    @property
    def user(self):
        return (self.request and self.request.user) or self._registry.models[settings.AUTH_USER_MODEL].objects.get(self.user_id)

    @property
    def user_id(self):
        return int((self.request and self.request.user_id) or self._context.get('user_id'))

    def __call__(self, **kwargs):
        ctx = self._context.copy()
        ctx.update(kwargs)
        return self.__class__(self._registry, **ctx)

    def ref(self, name):
        return self._registry.models['ir.object'].get_object(name).object_id

    def __enter__(self):
        self._old_env = getattr(self._registry._local_ctx, 'env', self._registry.env._root_env)
        self._registry._local_ctx.env = self
        self._registry._local_var.set(self)

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._registry._local_ctx.env = self._old_env
        self._registry._local_var.set(self._old_env)
