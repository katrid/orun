from collections import defaultdict

from orun import api
from orun.apps import apps
from orun.db import models
from orun.utils.translation import gettext_lazy as _

from orun.contrib.contenttypes.models import ContentType
#from ..fields import GenericForeignKey


class Action(models.Model):
    name = models.CharField(128, _('Name'), null=False, translate=True)
    action_type = models.CharField(32, _('Action Type'), null=False)
    usage = models.TextField(label=_('Usage'))
    description = models.TextField(label=_('Description'))
    # external_id = models.CharField(label=_('External ID'), getter='get_external_id')
    groups = models.ManyToManyField('auth.group')
    binding_model = models.ForeignKey('content.type', on_delete=models.CASCADE)
    binding_type = models.SelectionField(
        (
            ('action', _('Action')),
            ('print', _('Print')),
        ),
        default='action',
    )
    multiple = models.BooleanField(label='Restrict to lists')

    class Meta:
        name = 'ui.action'
        field_groups = {
            'list_fields': ['name', 'action_type', 'usage']
        }

    def save(self, *args, **kwargs):
        if not self.action_type:
            self.action_type = self.__class__._meta.name
        super(Action, self).save(*args, **kwargs)

    def get_action(self):
        return apps[self.action_type].objects.get(pk=self.pk)

    @api.method(select=['action_type'])
    def load(self, context=None):
        return self.get_action().to_dict(exclude=['groups'])

    def execute(self):
        raise NotImplemented()

    @classmethod
    def get_bindings(cls, model):
        r = defaultdict(list)
        # TODO: optimize filter by name (plain query)
        obj = apps['content.type'].objects.get_by_natural_key(model)
        for action in cls.objects.filter(binding_model_id=obj.pk):
            r[action.binding_type].append(action)
        return r


class WindowAction(Action):
    VIEW_MODE = (
        ('form', 'Form'),
        ('list', 'List'),
        ('card', 'Card'),
        ('search', 'Search'),
        ('calendar', 'Calendar'),
    )
    view = models.ForeignKey('ui.view', label=_('View'))
    domain = models.TextField(label=_('Domain'))
    context = models.TextField(label=_('Context'))
    model = models.CharField(128, null=False, label=_('Model'))
    object_id = models.BigIntegerField(label=_('Object ID'))
    #content_object = GenericForeignKey()
    view_mode = models.CharField(128, default='list,form', label=_('View Mode'))
    target = models.CharField(16, label=_('Target'), choices=(
        ('current', 'Current Window'),
        ('new', 'New Window'),
    ))
    limit = models.IntegerField(default=100, label=_('Limit'))
    auto_search = models.BooleanField(default=True, label=_('Auto Search'))
    # views = models.TextField(getter='_get_views', editable=False, serializable=True)
    view_list = models.OneToManyField('ui.action.window.view')
    view_type = models.SelectionField(VIEW_MODE, default='form')

    class Meta:
        name = 'ui.action.window'
        field_groups = {
            'list_fields': ['name', 'action_type', 'usage', 'view', 'model', 'view_mode', 'limit', 'auto_search']
        }

    def _get_views(self):
        modes = self.view_mode.split(',')
        views = self.view_list.all()
        modes = {mode: None for mode in modes}
        if self.view_id:
            modes[self.view_type] = self.view_id
        for v in views:
            modes[v.view_mode] = v.view_id
        if 'search' not in modes:
            modes['search'] = None
        return modes

    def from_model(self, model):
        if isinstance(model, models.Model):
            model = model._meta.name
        return self.objects.filter(model=model).first()


class WindowActionView(models.Model):
    window_action = models.ForeignKey(WindowAction, null=False)
    sequence = models.SmallIntegerField()
    view = models.ForeignKey('ui.view')
    view_mode = models.SelectionField(WindowAction.VIEW_MODE, label=_('View Type'))

    class Meta:
        name = 'ui.action.window.view'
        title_field = 'view'


class ViewAction(Action):
    view = models.ForeignKey('ui.view', label=_('View'))

    class Meta:
        name = 'ui.action.view'

    @api.classmethod
    def get_view(cls, id):
        if isinstance(id, list):
            id = id[0]
        view = apps['ui.view'].objects.get(pk=id)
        return {
            'content': view.render({}),
            'type': view.view_type,
        }


class UrlAction(Action):
    url = models.TextField()
    target = models.SelectionField(
        (
            ('new', 'New Window'),
            ('self', 'Current Window'),
        ), default='new', null=False,
    )

    class Meta:
        name = 'ui.action.url'


class ServerAction(Action):
    sequence = models.IntegerField(default=5)
    model = models.ForeignKey('content.type', null=False)
    code = models.TextField(label=_('Python Code'))
    actions = models.ManyToManyField('self')
    target_model = models.ForeignKey('content.type')
    target_field = models.ForeignKey('content.field')
    lines = models.OneToManyField('ui.action.server.line')

    class Meta:
        name = 'ui.action.server'


class ServerActionLine(models.Model):
    server_action = models.ForeignKey(ServerAction, null=False, on_delete=models.CASCADE)
    field = models.ForeignKey('content.field')
    value = models.TextField()
    type = models.SelectionField(
        (
            ('value', _('Value')),
            ('expr', _('Python Expression')),
        ), label=_('Evaluation Type')
    )

    class Meta:
        name = 'ui.action.server.line'


class ClientAction(Action):
    tag = models.CharField(512)
    target = models.SelectionField(
        (
            ('current', 'Current Window'),
            ('new', 'New Window'),
            ('fullscreen', 'Full Screen'),
            ('main', 'Main Action of Current Window'),
        ), default='current',
    )
    model_name = models.CharField(label=_('Model'))
    context = models.TextField()
    params = models.TextField()
    view = models.ForeignKey('ui.view')

    class Meta:
        name = 'ui.action.client'

    @api.method
    def get_view(self, id):
        vw = self.objects.get(id)
        if vw.view:
            return {
                'content': vw.view.render({}),
            }

