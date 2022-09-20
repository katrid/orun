from collections import defaultdict
from orun.db import models
from orun.http import HttpRequest
from orun.utils.translation import gettext


MENU_SEP = '/'


class Menu(models.Model):
    name = models.CharField(null=False, translate=True, full_text_search=True)
    sequence = models.IntegerField(default=99)
    parent = models.ForeignKey('self', related_name='children')
    action = models.ForeignKey('ui.action')
    groups = models.ManyToManyField('auth.group')
    icon = models.CharField()
    css_class = models.TextField()

    class Meta:
        name = 'ui.menu'
        ordering = ('sequence', 'pk')
        field_groups = {
            'list_fields': ['name', 'sequence', 'parent', 'action']
        }

    def __str__(self):
        return self.get_full_name()

    @classmethod
    def search_visible_items(cls, request):
        visible_items = defaultdict(list)

        def _iter_item(item):
            return [
                {
                    'id': menu_item.pk,
                    'name': gettext(menu_item.name),
                    'icon': menu_item.icon,
                    'url': menu_item.get_absolute_url(),
                    'action': menu_item.action_id,
                    'children': _iter_item(menu_item.pk)
                }
                for menu_item in visible_items[item]
            ]

        qs = cls.objects.all()
        # if cls.env.user_id == SUPERUSER or cls.env.user.is_superuser:
        if True: # todo replace by permisson control
            items = qs
        else:
            Group = cls.env['auth.group']
            UserGroups = cls.env['auth.user.groups.rel']
            MenuGroups = cls.env['ui.menu.groups.rel']
            q = MenuGroups.objects.join(Group).join(UserGroups)
            q = q.filter(
                UserGroups.c.from_auth_user_id == cls.env.user_id, MenuGroups.c.from_ui_menu_id == cls.c.pk
            )
            items = qs.filter(
                or_(~MenuGroups.objects.filter(MenuGroups.c.from_ui_menu_id == cls.c.pk).exists(), q.exists())
            ).all()
        for item in items:
            visible_items[item.parent_id].append(item)

        return _iter_item(None)

    @property
    def url(self):
        return self.get_absolute_url()

    def get_absolute_url(self):
        if self.action_id:
            return '#/app/?action=%s' % self.action_id
        elif self.parent_id:
            return '#'
        return '/web/menu/%s/' % self.pk

    def get_full_name(self):
        parent = self.parent
        objs = [self.name]
        while parent:
            objs.insert(0, parent.name)
            parent = parent.parent
        return MENU_SEP.join(objs)

    @classmethod
    def admin_search_menu(cls, request: HttpRequest, term: str):
        pass
