from orun.apps import apps
from orun.views.registry import Registry


registry = Registry()
# creation order
_COUNTER = 0


def _inc_counter(cls):
    global _COUNTER
    _COUNTER += 1
    cls.__order = _COUNTER


def register(qualname):
    def decorator(cls):
        registry[qualname] = cls
    return decorator


def register_action(cls: type):
    cls._admin_registrable = True
    _inc_counter(cls)
    return cls


def register_menu(cls: type):
    from .site import admin_site
    from .admin import MenuItem
    _inc_counter(cls)
    menu = MenuItem(cls)
    cls._admin_registrable = menu
    admin_site.register(menu)
    return cls
