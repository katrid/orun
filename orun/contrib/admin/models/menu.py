from collections import defaultdict
from operator import or_

from orun import SUPERUSER
from orun.apps import apps
from orun.db import models
from orun.http import HttpRequest
import orun.contrib.auth.models
from orun.utils.translation import gettext


MENU_SEP = '/'


class Menu(models.Model):
    name = models.CharField(null=False, translate=True)
    sequence = models.IntegerField(default=99)
    parent = models.ForeignKey('self', related_name='children')
    action = models.ForeignKey('ui.action')
    groups = models.ManyToManyField('auth.group', through='ui.menu.groups.rel')
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
        if cls._env.user_id == SUPERUSER or cls._env.user.is_superuser:
            items = qs
        else:
            items = qs.filter(groups__users__pk=cls._env.user_id).order_by('id').distinct('id')
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

    def traverse_children_objects(self):
        for child in self.objects.filter(parent_id=self.pk):
            for m in child.traverse_children_objects():
                yield m
            yield child


class Group(orun.contrib.auth.models.Group, helper=True):
    menus = models.ManyToManyField(Menu, through='ui.menu.groups.rel')


class MenuGroup(models.Model):
    menu = models.ForeignKey(Menu, null=False, ondelete=models.DB_CASCADE)
    group = models.ForeignKey('auth.group', null=False, on_delete=models.DB_CASCADE)

    class Meta:
        name = 'ui.menu.groups.rel'
