from orun import api
from orun.db import models
from orun.utils.translation import gettext_lazy as _, gettext
from orun.utils.module_loading import import_string
from orun.http import HttpRequest
from .action import Action


class Homepage(Action):
    content = models.TextField()

    class Meta:
        name = 'ui.action.homepage'

    @api.classmethod
    def get_portlets(cls, user_id):
        return [
            {'name': 'Create Partner', 'type': 'client', 'tag': 'createNew', 'action_type': 'ui.action.window', 'action': '', 'model': 'res.partner'},
        ]

    @api.method(request=True)
    def save_layout(self, layout, request: HttpRequest):
        home, _ = UserHomepage.objects.get_or_create(homepage_id=self.pk, user_id=int(request.user_id))
        home.update(content=layout)
        return True

    def _get_info(self, context):
        res = super()._get_info(context)
        # check if exists a user defined homepage
        try:
            home = UserHomepage.objects.get(homepage_id=self.pk, user_id=context['user_id'])
            res['content'] = home.content
        except UserHomepage.DoesNotExist:
            pass
        return res


class HomepageGroup(models.Model):
    name = models.CharField(128)
    group = models.ForeignKey('auth.group')
    info = models.JSONField()

    class Meta:
        name = 'ui.homepage.group'


class UserHomepage(models.Model):
    homepage = models.ForeignKey(Homepage, null=False, on_delete=models.DB_CASCADE)
    user = models.ForeignKey('auth.user', null=False, on_delete=models.DB_CASCADE)
    content = models.TextField()

    class Meta:
        name = 'ui.user.homepage'
        unique_together = ('homepage', 'user')


class Portlet(models.Model):
    name = models.CharField(256, null=False, label=_('Portlet Type'))
    schema = models.CharField(128, db_index=True)
    active = models.BooleanField(default=True, label=_('Active'))
    tag = models.CharField(128, label=_('Tag Name'), null=False)
    type_name = models.CharField(label=_('Type Name'))
    description = models.TextField()
    info = models.TextField()

    class Meta:
        name = 'ui.portlet'

    def get_info(self):
        info = self.info
        if self.type_name:
            tp = import_string(self.type_name)
            info = tp.get_info()
        return {
            'id': self.pk,
            'name': gettext(self.name),
            'tag': self.tag,
            'description': self.description,
            'info': info,
        }

    @api.classmethod
    def search_portlets(cls):
        res = []
        for p in Portlet.objects.filter(active=True):
            res.append(p.get_info())
        return {'portlets': res}
