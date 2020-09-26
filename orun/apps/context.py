from typing import TYPE_CHECKING, Optional
if TYPE_CHECKING:
    from .registry import Registry


class Environment:
    def __init__(self, registry: 'Registry', context: Optional[dict] = None, **kwargs):
        if context is None:
            context = {}
        for k, v in kwargs.items():
            context[k] = v
        self._context = context
        self._registry = registry

    def _get_user_id(self, context):
        user_id = context['user_id']
        if user_id is None and 'request' in context:
            user_id = context['user_id'] = context['request'].user_id
        return user_id

    def _get_user(self, context):
        if '_cached_user' not in context:
            context['_cached_user'] = self._registry['auth.user'].objects.get(pk=context['user_id'])
        return context['_cached_user']

    @property
    def user_id(self):
        return self._get_user_id(self._registry._local_env._context)

    @property
    def user(self):
        return self._get_user(self._registry._local_env._context)

    def __call__(self, **kwargs):
        return self.__class__(self._registry, dict(self._context), **kwargs)

    def sudo(self, *args, **kwargs):
        from orun.conf import settings
        kwargs.setdefault('user_id', settings.SUPER_USER_ID)
        return self(**kwargs)

    def __getitem__(self, item) -> 'Model':
        return self._registry[item]

    def __getattr__(self, item):
        return
        return self._registry._context[item]

    def __enter__(self):
        from orun.utils import translation
        self._registry._local_env._context = self
        if not self._old_context or (self._context.get('language_code') and self._old_context['language_code'] != self._context['language_code']):
            if 'language_code' in self._context:
                translation.activate(self._context['language_code'])
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        from orun.utils import translation
        # restore the context state
        if self._old_context and self._old_context['language_code'] != self._context['language_code']:
            translation.activate(self._old_context['language_code'])
        self._registry._local_env._context = self._old_context

    def clone(self):
        return self.context_cls(self.apps, old_context=self.apps._local_env._context)

    def setup(self):
        from orun.conf import settings

        if not hasattr(self._registry._local_env, '_context'):
            self._registry._local_env._context = {}
            self._registry._local_env._context['language_code'] = settings.LANGUAGE_CODE
            self._registry._local_env._context['user_id'] = settings.SUPER_USER_ID
