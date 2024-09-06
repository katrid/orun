from typing import ClassVar
from orun import api
from orun.apps import apps
from orun.contrib import auth
from orun.conf import settings
from orun.contrib.auth.hashers import check_password
from orun.core.exceptions import PermissionDenied
from orun.http import HttpRequest
from orun.db import models
from orun.utils.translation import gettext_lazy as _
from orun.contrib.auth.models import AbstractUser
from .partner import Partner


# class ModelAccess(models.Model):
#     name = models.CharField(null=False)
#     active = models.BooleanField(default=True)
#     model = models.ForeignKey('content.type', on_delete=models.CASCADE, null=False)
#     group = models.ForeignKey('auth.group', on_delete=models.CASCADE)
#     perm_read = models.BooleanField(default=True)
#     perm_change = models.BooleanField()
#     perm_create = models.BooleanField()
#     perm_delete = models.BooleanField()
#     perm_full = models.BooleanField()
#
#     class Meta:
#         name = 'auth.model.access'
#
#     @classmethod
#     def has_permission(cls, model, operation, user=None):
#         if user is None:
#             if g.user_id == SUPERUSER or g.user.is_superuser:
#                 return True
#             user = g.user_id
#         return True
#         args = []
#         if operation == 'read':
#             args.append(cls.c.perm_read == True)
#         elif operation == 'create':
#             args.append(cls.c.perm_create == True)
#         elif operation == 'change':
#             args.append(cls.c.perm_change == True)
#         elif operation == 'delete':
#             args.append(cls.c.perm_delete == True)
#         else:
#             args.append(cls.c.perm_full == True)
#         User = app['auth.user']
#         Model = app['content.type']
#         Group = app['auth.group']
#         # qs = session.query(cls.c.pk).join(Model).outerjoin(Group).filter(
#         #     Model.c.name == model, cls.c.active == True, *args
#         # )
#         return bool(len(qs))


class User(AbstractUser, Partner):
    # date_joined = models.DateTimeField(_('Date Joined'), auto_now=True)
    signature = models.HtmlField(_('Signature'))
    user_action = models.ForeignKey('ui.action', verbose_name=_('Home Action'))
    user_company = models.ForeignKey('res.company')
    # groups = models.ManyToManyField(Group, verbose_name=_('Groups'))
    companies = models.ManyToManyField('res.company', verbose_name=_('Companies'))
    groups = models.ManyToManyField(
        'auth.group',
        verbose_name=_('groups'),
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name="user_set",
        related_query_name="user",
    )

    class Meta:
        schema = 'auth'
        name = 'auth.user'

    def set_password(self, password):
        from orun.contrib.auth.hashers import make_password
        self.password = make_password(password)

    def has_perm(self, perm, obj=None):
        return True

    def has_perms(self, perm_list, obj=None):
        for perm in perm_list:
            if not self.has_perm(perm, obj):
                return False
        return True

    def has_group(self, group: str | int):
        if isinstance(group, int):
            return self.groups.filter(group_id=group).exists()
        return self.groups.filter(name=group).exists()

    @classmethod
    def authenticate(cls, username, password):
        usr = cls.objects.filter(username=username, active=True, is_staff=True).first()
        if usr and check_password(password, usr.password):
            return usr

    @api.method
    def change_password(self, old_password, new_password):
        # check user password
        print(self.env.user)
        user = auth.authenticate(username=self.env.user.username, password=old_password)
        if user and new_password:
            user.set_password(new_password)
            user.save()
            return self.env.user_id
        raise PermissionDenied(_('Invalid password!'))

    def user_info(self):
        return {
            'id': self.pk,
            'name': self.name,
            'avatar': (self.image and self.image.url) or None,
            'username': self.username,
            'last_login': self.__class__._meta.fields['last_login'].value_to_json(self.last_login),
            'language': (self.language and self.language.code) or settings.LANGUAGE_CODE,
        }


class Rule(models.Model):
    name = models.CharField()
    active = models.BooleanField(default=True)
    model = models.ForeignKey('content.type')
    groups = models.ManyToManyField('auth.group')
    domain = models.TextField(label='Conditions', help_text='Python expression representing the filter condition')
    can_read = models.BooleanField(default=True)
    can_change = models.BooleanField(default=True)
    can_create = models.BooleanField(default=True)
    can_delete = models.BooleanField(default=True)

    class Meta:
        name = 'auth.rule'
        verbose_name = 'Rule'
        verbose_name_plural = 'Rules'

    @classmethod
    def get_rules(cls, model: str):
        return cls.objects.filter(model__name=model)

    def eval_rule(self, context: dict):
        context['__builtins__'] = None
        return eval(self.domain, context)


class Export(models.Model):
    name = models.CharField(256, null=False)
    model = models.CharField(128, db_index=True)

    class Meta:
        name = 'auth.export'


class ExportField(models.Model):
    export = models.ForeignKey(Export, null=False, on_delete=models.CASCADE)
    name = models.CharField(128, null=False)

    class Meta:
        name = 'auth.export.field'


class UserData(models.Model):
    user = models.ForeignKey(User, null=False, on_delete=models.CASCADE)
    key = models.CharField(128, null=False, db_index=True)
    value = models.TextField()

    class Meta:
        name = 'auth.user.data'
        log_changes = False

    @classmethod
    def get_data(cls, user_id: int, key: str):
        d = cls.objects.filter(user_id=user_id, key=key).first()
        return d and d.value
