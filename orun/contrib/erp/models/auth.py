from orun import api
from orun.contrib import auth
from orun.conf import settings
from orun.contrib.auth.hashers import check_password
from orun.core.exceptions import PermissionDenied, ValidationError
from orun.http import HttpRequest
from orun.db import models
from orun.utils.translation import gettext_lazy as _, gettext
from orun.contrib.auth.models import AbstractUser, Permission

from .partner import Partner
from .company import Company


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
    user_company = models.ForeignKey('res.company', label=_('Default Company'))
    # groups = models.ManyToManyField(Group, verbose_name=_('Groups'))
    companies = models.OneToManyField('auth.user.companies.rel', label=_('Companies'))
    groups = models.ManyToManyField(
        'auth.group',
        through='auth.user.groups.rel',
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

    def has_perm(self, perm: str, model: str = None, obj=None):
        """
        Check if the user has a specific permission.
        """
        if not self.is_active:
            return False
        if self.is_superuser:
            return True
        return Permission.has_perm(self.pk, model, perm)

    def has_group(self, group: str | int):
        if isinstance(group, int):
            return self.groups.filter(group_id=group).exists()
        return self.groups.filter(name=group).exists()

    @classmethod
    def authenticate(cls, username, password):
        usr = cls.objects.filter(username=username, active=True, is_staff=True).first()
        if usr and check_password(password, usr.password):
            return usr

    @api.classmethod
    def change_password(cls, request: HttpRequest, old_password, new_password):
        # check user password
        user = auth.authenticate(username=request.user.username, password=old_password)
        if user and new_password and user.is_active:
            user.set_password(new_password)
            user.save()
            return {'message': gettext('Password changed successfully'), 'success': True}
        raise ValidationError(_('Invalid password'))

    def user_info(self):
        company = self.get_current_company()
        if company:
            company = {
                'id': company.pk,
                'name': company.name,
                'logo': (company.image and company.image.url) or None,
            }
        res = {
            'id': self.pk,
            'name': self.name,
            'avatar': (self.image and self.image.url) or None,
            'username': self.username,
            'last_login': self.__class__._meta.fields['last_login'].value_to_json(self.last_login),
            'language': (self.language and self.language.code) or settings.LANGUAGE_CODE,
            'company': company,
        }
        if self.is_superuser:
            res['superuser'] = True
        return res

    def get_current_company(self):
        if self.user_company:
            return self.user_company
        company = self.companies.first()
        if company:
            return self.companies.first()
        return Company.objects.filter(active=True).first()

    @classmethod
    def get_default_company(cls):
        return Company.objects.order_by('pk').filter(active=True).first()

    @api.classmethod
    def get_companies(cls, request: HttpRequest):
        user_id = request.user_id
        user = cls.objects.get(id=user_id, active=True)
        if not user:
            raise PermissionDenied(_('User not found'))
        if user.is_superuser:
            companies = Company.objects.filter(active=True)
        else:
            companies = user.companies.filter(active=True)
        if companies:
            return [{'id': c.pk, 'name': c.name} for c in companies]

    @api.classmethod
    def set_user_company(cls, request: HttpRequest, company_id):
        user = cls.objects.get(id=request.user_id, active=True)
        if not user:
            raise PermissionDenied(_('User not found'))
        if user.is_superuser:
            company = Company.objects.get(id=company_id, active=True)
            if not company:
                raise PermissionDenied(_('Company not found'))
        else:
            company = user.companies.filter(id=company_id, active=True).first()
            if not company:
                raise PermissionDenied(_('Company not found'))
        user.update(user_company_id=company.pk)
        return True

    def after_insert(self, modified_fields):
        super().after_insert(modified_fields)
        if self.user_company_id:
            self.companies.add(self.user_company)

    @api.classmethod
    def api_get_defaults(cls, request: HttpRequest, context=None, *args, **kwargs):
        res = super().api_get_defaults(context, *args, **kwargs)
        # send default company as the current user company
        user = request.user
        default_company = user.get_current_company()
        if default_company:
            res['user_company'] = {'id': default_company.pk, 'text': default_company.name}
        print(res)
        return res


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
        return cls.objects.filter(model__name=model, active=True)

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


class UserCompanies(models.Model):
    user = models.ForeignKey('auth.user', on_delete=models.CASCADE, null=False)
    company = models.ForeignKey('res.company', on_delete=models.CASCADE, null=False)

    class Meta:
        name = 'auth.user.companies.rel'
        unique_together = ('user', 'company')
