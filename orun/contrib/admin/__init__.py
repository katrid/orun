from orun.apps import apps
from orun.views.registry import Registry


registry = Registry()


def register(qualname):
    def decorator(cls):
        registry[qualname] = cls
    return decorator


def register_action(cls: type):
    cls._admin_registrable = True
    return cls


def register_menu(cls: type):
    from .site import admin_site
    from .admin import MenuItem
    menu = MenuItem(cls)
    cls._admin_registrable = menu
    admin_site.register(menu)
    return cls
