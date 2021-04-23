from orun.views.registry import Registry


registry = Registry()


def register(qualname):
    def decorator(cls):
        registry[qualname] = cls
    return decorator
