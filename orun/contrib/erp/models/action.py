from collections import defaultdict

from orun import api
from orun.apps import apps
from orun.db import models
from orun.utils.translation import gettext_lazy as _

from .contenttype import ContentType
#from ..fields import GenericForeignKey


class Action(models.Model):
    name = models.CharField(128, _('Name'), null=False, translate=True)
    action_type = models.CharField(32, _('Action Type'), null=False)
    usage = models.TextField(verbose_name=_('Usage'))
    description = models.TextField(verbose_name=_('Description'))
    groups = models.ManyToManyField('auth.group')
    binding_model = models.ForeignKey('ir.model', on_delete=models.CASCADE)
    binding_type = models.SelectionField(
        (
            ('action', _('Action')),
            ('print', _('Print')),
        ),
        default='action',
    )
    multiple = models.BooleanField(label='Restrict to lists')

    class Meta:
        name = 'ir.action'
        field_groups = {
            'list_fields': ['name', 'action_type', 'usage']
        }

    def save(self, *args, **kwargs):
        if not self.action_type:
            self.action_type = self.__class__._meta.name
        super(Action, self).save(*args, **kwargs)

    def get_action(self):
        return apps[self.action_type].objects.get(pk=self.pk)

    @api.method
    def load(self, id, context=None):
        return self.objects.get(pk=id).get_action().to_json()

    def execute(self):
        raise NotImplemented()

    @classmethod
    def get_bindings(cls, model):
        r = defaultdict(list)
        # TODO: optimize filter by name (plain query)
        obj = apps['ir.model'].get_by_natural_key(model)
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
    view = models.ForeignKey('ui.view', verbose_name=_('View'))
    domain = models.TextField(verbose_name=_('Domain'))
    context = models.TextField(verbose_name=_('Context'))
    model = models.CharField(128, null=False, label=_('Model'))
    object_id = models.BigIntegerField(verbose_name=_('Object ID'))
    #content_object = GenericForeignKey()
    view_mode = models.CharField(128, default='list,form', verbose_name=_('View Mode'))
    target = models.CharField(16, verbose_name=_('Target'), choices=(
        ('current', 'Current Window'),
        ('new', 'New Window'),
    ))
    limit = models.IntegerField(default=100, verbose_name=_('Limit'))
    auto_search = models.BooleanField(default=True, verbose_name=_('Auto Search'))
    views = models.TextField(getter='_get_views', editable=False, serializable=True)
    view_list = models.OneToManyField('ir.action.window.view')
    view_type = models.SelectionField(VIEW_MODE, default='form')

    class Meta:
        name = 'ir.action.window'
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
        name = 'ir.action.window.view'
        title_field = 'view'


class ViewAction(Action):
    view = models.ForeignKey('ui.view', verbose_name=_('View'))

    class Meta:
        name = 'ir.action.view'

    @api.method
    def get_view(self, id):
        obj = app['ui.view'].objects.get(id)
        return {
            'content': obj.render({}),
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
        name = 'ir.action.url'


class ServerAction(Action):
    sequence = models.IntegerField(default=5)
    model = models.ForeignKey('ir.model', null=False)
    code = models.TextField(label=_('Python Code'))
    actions = models.ManyToManyField('self')
    target_model = models.ForeignKey('ir.model')
    target_field = models.ForeignKey('ir.model.field')
    lines = models.OneToManyField('ir.action.server.line')

    class Meta:
        name = 'ir.action.server'


class ServerActionLine(models.Model):
    server_action = models.ForeignKey(ServerAction, null=False, on_delete=models.CASCADE)
    field = models.ForeignKey('ir.model.field')
    value = models.TextField()
    type = models.SelectionField(
        (
            ('value', _('Value')),
            ('expr', _('Python Expression')),
        ), label=_('Evaluation Type')
    )

    class Meta:
        name = 'ir.action.server.line'


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
        name = 'ir.action.client'

    @api.method
    def get_view(self, id):
        vw = self.objects.get(id)
        if vw.view:
            return {
                'content': vw.view.render({}),
            }

