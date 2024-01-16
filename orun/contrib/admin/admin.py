from orun.apps import apps
from orun.contrib.contenttypes.models import Registrable
from .models import Group, MenuGroup, Menu


class MenuItem(Registrable):
    name: str = None
    model: type = Menu
    object_id: str = None
    qualname: str = None
    sequence: int = 99
    icon = None
    css = None
    groups: [str | type] = []
    delete = False
    parent: type = None
    action: str = None

    @classmethod
    def children(cls):
        return [child for k, child in filter(lambda x: not (x[0].startswith('_') or x[0] == 'action') and isinstance(x[1], type), cls.__dict__.items())]

    @classmethod
    def _register_menu_item(cls):
        from orun.utils.text import re_camel_case
        if not cls.name:
            cls.name = re_camel_case.sub(r' \1', cls.__name__).strip()
        if cls.action:
            cls.action = apps['ir.object'].objects.get(name=cls.action).content_object.pk
        info = {
            'name': cls.name,
            'sequence': cls.sequence,
            'icon': cls.icon,
            'css': cls.css,
            'parent': cls.parent,
            'action_id': cls.action,
        }
        m = cls._register_object(Menu, cls.qualname, info)
        return m

    @classmethod
    def _clear_childs(cls):
        for child in cls.children():
            if not child.qualname:
                child.qualname = f'{child.__module__}.{child.__name__}'
            child.delete_object()
    
    @classmethod
    def delete_object(cls):
        # clear all childs before deleting
        cls._clear_childs()
        # purge m2m join table before deleting
        apps['ui.menu.groups.rel'].objects.filter(menu__name=cls.name).delete()                
        super().delete_object(cls.qualname)

    @classmethod
    def update_info(cls) -> type:
        cls.qualname = cls.object_id or f'{cls.__module__}.{cls.__name__}'
        if cls.delete:
            cls.delete_object()
        else:
            # mount the menu structure
            instance = cls._register_menu_item()
            for child in cls.children():
                child.parent = instance.pk
                # inherit parent groups to child
                if cls.groups and not child.groups:
                    child.groups = cls.groups
                child.update_info()
            if cls.groups:
                cls._register_groups(instance)
            return instance
    
    @classmethod
    def _register_groups(cls, menu: type):
        for group in cls.groups:
            group_pk = None
            if isinstance(group, str):
                obj = Group.objects.filter(name=group).first()
                if obj is not None:
                    group_pk = obj.pk
            else:
                group_pk = group.get_id()
            if group_pk is not None:
                rel = MenuGroup.objects.filter(menu=menu, group_id=group_pk).first()
                if rel is None:
                    MenuGroup.objects.create(menu=menu, group_id=group_pk)


def register_groups(**groups):
    for k, v in groups.items():
        values = {'name': k}
        if isinstance(v, str):
            values['description'] = v
        elif isinstance(v, dict):
            values.update(v)
        Group.objects.create(**values)


class AuthGroup(Registrable):
    model: type = Group
    name: str = None
    permissions: list = []
    users: list = []
    objects = None
    menus: list[str | MenuItem] = []
    delete: bool = False

    @classmethod
    def _register_menus(cls, menus: list, group: Group) -> None:
        for menu in menus:
            menu_pk = None
            if type(menu) == str:
                for obj in Menu.objects.all():
                    if obj.get_full_name() == menu:
                        menu_pk = obj.pk
                        break
            else:
                menu_pk = menu.get_id()
            if menu_pk:
                rel = MenuGroup.objects.filter(menu_id=menu_pk, group=group).first()
                if rel is None:
                    MenuGroup.objects.create(menu_id=menu_pk, group=group)

    @classmethod
    def delete_object(cls):
        # purge m2m join table before deleting
        apps['ui.menu.groups.rel'].objects.filter(group__name=cls.name).delete()
        super().delete_object(cls.qualname)

    @classmethod
    def update_info(cls) -> Group:
        cls.qualname = f'{cls.__module__}.{cls.__name__}'
        if cls.delete:
            return cls.delete_object()
        else:
            group_info = {
                'name': cls.name,
                'objects': cls.objects
            }
            instance = cls._register_object(Group, cls.qualname, group_info)
            if cls.menus:
                cls._register_menus(cls.menus, instance)
            return instance