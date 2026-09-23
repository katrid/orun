from orun.conf import settings
from contextvars import ContextVar
from contextlib import contextmanager

from types import TracebackType


class LazyEnvironment:
    def __init__(self, registry, root):
        self._registry = registry
        self._root_env = root

    def __getattr__(self, item):
        return getattr(self._registry._local_var.get(), item)
        # return getattr(getattr(self._registry._local_ctx, 'env', self._root_env), item, None)

    def __call__(self, **kwargs):
        return self._root_env(**kwargs)


class Environment:
    _old_env = None
    _token = None

    def __init__(self, registry, **kwargs):
        self._registry = registry
        self._context = kwargs
        self.request = kwargs.get('request')

    @property
    def user(self):
        return (self.request and self.request.user) or self._registry.models[settings.AUTH_USER_MODEL].objects.get(
            self.user_id
        )

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


from contextvars import ContextVar


class Context:
    __slots__ = ('_values', '_ctx_var', '_tokens')

    def __init__(self, **kwargs):
        self._values = kwargs
        self._ctx_var = ContextVar('context', default=kwargs)
        self._tokens = ContextVar('context_tokens', default=None)

    def __call__(self, **kwargs):
        scope = object.__new__(type(self))
        scope._values = kwargs
        scope._ctx_var = self._ctx_var
        scope._tokens = self._tokens
        return scope

    def __enter__(self):
        previous = self._tokens.get()
        token = self._ctx_var.set(self._values)
        self._tokens.set((token, previous))
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        token, previous = self._tokens.get()
        self._ctx_var.reset(token)
        self._tokens.set(previous)
        return False

    def __getitem__(self, item):
        return self._ctx_var.get().get(item)

    def __getattr__(self, item):
        return self._ctx_var.get().get(item)
