from orun import apps, api, g, SUPERUSER
from orun import auth
from orun.auth.hashers import check_password
from orun.core.exceptions import PermissionDenied
from orun.db import models
from orun.utils.translation import gettext_lazy as _
from .partner import Partner


class Group(models.Model):
    name = models.CharField(128, _('nome'), unique=True)
    active = models.BooleanField(default=True, verbose_name=_('Active'), help_text=_('Group is active'))

    class Meta:
        name = 'auth.group'
        verbose_name = _('group')
        verbose_name_plural = _('groups')


class ModelAccess(models.Model):
    name = models.CharField(null=False)
    active = models.BooleanField(default=True)
    model = models.ForeignKey('ir.model', on_delete=models.CASCADE, null=False)
    group = models.ForeignKey('auth.group', on_delete=models.CASCADE)
    perm_read = models.BooleanField(default=True)
    perm_change = models.BooleanField()
    perm_create = models.BooleanField()
    perm_delete = models.BooleanField()
    perm_full = models.BooleanField()

    class Meta:
        name = 'auth.model.access'

    @classmethod
    def has_permission(cls, model, operation, user=None):
        if user is None:
            if g.user_id == SUPERUSER or g.user.is_superuser:
                return True
            user = g.user_id
        return True
        args = []
        if operation == 'read':
            args.append(cls.c.perm_read == True)
        elif operation == 'create':
            args.append(cls.c.perm_create == True)
        elif operation == 'change':
            args.append(cls.c.perm_change == True)
        elif operation == 'delete':
            args.append(cls.c.perm_delete == True)
        else:
            args.append(cls.c.perm_full == True)
        User = app['auth.user']
        Model = app['ir.model']
        Group = app['auth.group']
        # qs = session.query(cls.c.pk).join(Model).outerjoin(Group).filter(
        #     Model.c.name == model, cls.c.active == True, *args
        # )
        return bool(len(qs))


class User(Partner):
    date_joined = models.DateTimeField(_('Date Joined'), auto_now=True)
    username = models.CharField(255, _('Login Name'))
    signature = models.HtmlField(_('Signature'))
    is_active = models.BooleanField(default=True)
    action = models.ForeignKey('ir.action', label=_('Home Action'))
    user_company = models.ForeignKey('res.company')
    is_staff = models.BooleanField(default=True, label=_('Is staff'))
    is_superuser = models.BooleanField(default=False, label=_('Superuser'))
    groups = models.ManyToManyField(Group, label=_('Groups'))
    companies = models.ManyToManyField('res.company', label=_('Companies'))
    password = models.PasswordField(label=_('Password'))

    class Meta:
        name = 'auth.user'

    def set_password(self, password):
        from orun.auth.hashers import make_password
        self.password = make_password(password)

    def has_perm(self, perm, obj=None):
        return True

    def has_perms(self, perm_list, obj=None):
        for perm in perm_list:
            if not self.has_perm(perm, obj):
                return False
        return True

    @classmethod
    def authenticate(cls, username, password):
        print(cls._meta.fields['active'])
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


class Rule(models.Model):
    name = models.CharField()
    active = models.BooleanField(default=True)
    model = models.ForeignKey('ir.model')
    groups = models.ManyToManyField('auth.group')
    domain = models.TextField()
    can_read = models.BooleanField(default=True)
    can_change = models.BooleanField(default=True)
    can_create = models.BooleanField(default=True)
    can_delete = models.BooleanField(default=True)

    class Meta:
        name = 'auth.rule'


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
