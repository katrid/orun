from orun.apps import apps
from orun import api
from orun.contrib import auth
from orun.conf import settings
from orun.http import HttpRequest
from orun.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from orun.core.exceptions import PermissionDenied
from orun.core.mail import send_mail
from orun.db import models
from orun.db.models.manager import EmptyManager
from orun.utils import timezone
from orun.utils.translation import gettext_lazy as _
from orun.core.mail import send_mail
from orun.contrib.contenttypes.models import ContentType

from .validators import UnicodeUsernameValidator


def update_last_login(sender, user, **kwargs):
    """
    A signal receiver which updates the last_login date for
    the user logging in.
    """
    user.update(last_login=timezone.now())


class PermissionManager(models.Manager):
    use_in_migrations = True

    def get_by_natural_key(self, codename, app_label, model):
        ContentType = self.env['content.type']
        return self.get(
            codename=codename,
            content_type=ContentType.objects.db_manager(self.db).get_by_natural_key(app_label, model),
        )


class Permission(models.Model):
    """
    The permissions system provides a way to assign permissions to specific
    users and groups of users.

    The permission system is used by the Orun admin site, but may also be
    useful in your own code. The Orun admin site uses permissions as follows:

        - The "add" permission limits the user's ability to view the "add" form
          and add an object.
        - The "change" permission limits a user's ability to view the change
          list, view the "change" form and change an object.
        - The "delete" permission limits the ability to delete an object.
        - The "view" permission limits the ability to view an object.

    Permissions are set globally per type of object, not per specific object
    instance. It is possible to say "Mary may change news stories," but it's
    not currently possible to say "Mary may change news stories, but only the
    ones she created herself" or "Mary may only change news stories that have a
    certain status or publication date."

    The permissions listed above are automatically created for each model.
    """
    name = models.CharField(_('name'), max_length=255, null=False)
    content_type = models.ForeignKey(
        'content.type', models.CASCADE, verbose_name=_('content type'), db_index=True, null=False,
    )
    codename = models.CharField(_('codename'), max_length=100, null=False)

    objects = PermissionManager()

    class Meta:
        name = 'auth.permission'
        verbose_name = _('permission')
        verbose_name_plural = _('permissions')
        unique_together = (('content_type', 'codename'),)
        ordering = ('content_type__schema', 'content_type__name', 'codename')

    def __str__(self):
        return "%s | %s" % (
            self.content_type,
            self.name,
        )

    def natural_key(self):
        return (self.codename,) + self.content_type.natural_key()

    @classmethod
    def has_group_perm(cls, group: str | int, model: str, perm: str):
        """
        Check if the group has the given permission for a model.
        :param str | int group: Group name or id
        :param str model: Model name
        :param perm: Permission codename
        :return: Returns True if the group has the given permission for a model.
        """
        perms = list(GroupPermissions.objects.only('allow').filter(
            group__name=group, permission__content_type__name=model, permission__codename=perm
        ))
        if not perms:
            return False
        return perms[0].allow

    @classmethod
    def has_perm(cls, user: int, model: str, perm: str):
        """
        Check if the user has the given permission for a model.
        :param user: User id
        :param model: Model name
        :param perm: Permission codename
        :return: Returns True if the user has the given permission for a model.
        """
        perms = GroupPermissions.objects.only('allow').filter(
            group__users__user_id=user, permission__content_type__name=model, permission__codename=perm,
        )
        if not perms:
            # allowed by default
            return True
        return any(p.allow for p in perms)

    @api.classmethod
    def list_model_permissions(cls, model: str = None):
        """
        List all permissions for a model.
        :param model: Model name
        :return: Returns a list of permissions for the given model.
        """
        objects = cls.objects
        if model:
            objects = objects.filter(content_type__name=model)
        labels = {k: v._meta.verbose_name for k, v in apps.models.items() if v._meta and v._meta.verbose_name}
        models = [{'id': ct.pk, 'name': ct.name, 'label': labels.get(ct.name)} for ct in ContentType.objects.only('pk', 'name').all()]
        return {
            'models': models,
            'permissions': [
                {'id': o[0], 'codename': o[1], 'name': o[2], 'model': o[3]}
                for o in objects.values_list('pk', 'codename', 'name', 'content_type')
            ]
        }

    @api.classmethod
    def list_groups(cls):
        return Group.objects.filter(active=True).values('pk', 'name', 'description')


class GroupManager(models.Manager):
    """
    The manager for the auth's Group model.
    """
    use_in_migrations = True

    def get_by_natural_key(self, name):
        return self.get(name=name)


class Group(models.Model):
    """
    Groups are a generic way of categorizing users to apply permissions, or
    some other label, to those users. A user can belong to any number of
    groups.

    A user in a group automatically has all the permissions granted to that
    group. For example, if the group 'Site editors' has the permission
    can_edit_home_page, any user in that group will have that permission.

    Beyond permissions, groups are a convenient way to categorize users to
    apply some label, or extended functionality, to them. For example, you
    could create a group 'Special users', and you could write code that would
    do special things to those users -- such as giving them access to a
    members-only portion of your site, or sending them members-only email
    messages.
    """
    name = models.CharField(label=_('Name'), max_length=150, null=False, unique=True, translate=True)
    description = models.CharField(label=_('Description'), max_length=200)
    active = models.BooleanField(verbose_name=_('Active'), default=True)
    allow_by_default = models.BooleanField(label=_('Allow by default'), default=True, help_text='Group has all models permissions by default')
    permissions = models.OneToManyField('auth.group.permissions', verbose_name=_('permissions'))
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, label=_('Users'), through='auth.user.groups.rel')
    object_type = models.ChoiceField(
        {'system': _('System'), 'user': _('User')}, label=_('Object Type'), default='system',
    )

    objects = GroupManager()

    class Meta:
        name = 'auth.group'
        verbose_name = _('Group')
        verbose_name_plural = _('Group')

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)

    def has_perm(self, model: str, perm: str):
        """
        Get the permission for a model and a permission name.
        :param model:
        :param perm:
        :return: Returns True if the group has the given permission for a model.
        """
        perms = list(GroupPermissions.objects.only('allow').filter(
            group=self, permission__content_type__name=model, permission__codename=perm
        ))
        if not perms:
            if self.allow_by_default:
                return True
            return False
        return perms[0].allow

    @classmethod
    def _from_json(cls, instance, data, **kwargs):
        permissions = data.pop('permissions', None)
        # normalize model permissions
        super()._from_json(instance, data, **kwargs)
        if isinstance(permissions, dict):
            GroupPermissions.create_all(instance.pk, [int(k) for k in permissions.keys()])
            allowed = (k for k, v in permissions.items() if v)
            disallowed = (k for k, v in permissions.items() if not v)
            if disallowed:
                GroupPermissions.objects.filter(group=instance, permission_id__in=disallowed).update(allow=False)
            if allowed:
                GroupPermissions.objects.filter(group=instance, permission_id__in=allowed).update(allow=True)
        return instance


class GroupPermissions(models.Model):
    permission = models.ForeignKey(Permission, null=False)
    group = models.ForeignKey(Group, null=False)
    allow = models.BooleanField(default=True)

    class Meta:
        name = 'auth.group.permissions'
        verbose_name = _('Group Permission')
        verbose_name_plural = _('Group Permissions')
        unique_together = (('permission', 'group'),)

    @classmethod
    def create_all(cls, group_id, perms):
        exist = list(cls.objects.filter(group_id=group_id, permission_id__in=perms).values_list('permission', flat=True))
        must_create = set(perms) - set(exist)
        if must_create:
            cls.objects.bulk_create(
                [cls(permission_id=perm, group_id=group_id) for perm in must_create]
            )


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, password, **extra_fields):
        """
        Create and save a user with the given username, email, and password.
        """
        if not username:
            raise ValueError('The given username must be set')
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(username, email, password, **extra_fields)


# A few helper functions for common logic between User and AnonymousUser.
def _user_get_all_permissions(user, obj):
    permissions = set()
    for backend in auth.get_backends():
        if hasattr(backend, "get_all_permissions"):
            permissions.update(backend.get_all_permissions(user, obj))
    return permissions


def _user_has_perm(user, perm, obj):
    """
    A backend can raise `PermissionDenied` to short-circuit permission checking.
    """
    for backend in auth.get_backends():
        if not hasattr(backend, 'has_perm'):
            continue
        try:
            if backend.has_perm(user, perm, obj):
                return True
        except PermissionDenied:
            return False
    return False


def _user_has_module_perms(user, app_label):
    """
    A backend can raise `PermissionDenied` to short-circuit permission checking.
    """
    for backend in auth.get_backends():
        if not hasattr(backend, 'has_module_perms'):
            continue
        try:
            if backend.has_module_perms(user, app_label):
                return True
        except PermissionDenied:
            return False
    return False


class PermissionsMixin(models.Model):
    """
    Add the fields and methods necessary to support the Group and Permission
    models using the ModelBackend.
    """
    is_superuser = models.BooleanField(
        _('superuser status'),
        default=False,
        help_text=_(
            'Designates that this user has all permissions without '
            'explicitly assigning them.'
        ),
        null=False,
    )

    # groups = models.ManyToManyField(
    #     Group,
    #     verbose_name=_('groups'),
    #     help_text=_(
    #         'The groups this user belongs to. A user will get all permissions '
    #         'granted to each of their groups.'
    #     ),
    #     related_name="user_set",
    #     related_query_name="user",
    # )
    # user_permissions = models.ManyToManyField(
    #     Permission,
    #     verbose_name=_('user permissions'),
    #     blank=True,
    #     help_text=_('Specific permissions for this user.'),
    #     related_name="user_set",
    #     related_query_name="user",
    # )

    class Meta:
        abstract = True

    def get_group_permissions(self, obj=None):
        """
        Return a list of permission strings that this user has through their
        groups. Query all available auth backends. If an object is passed in,
        return only permissions matching this object.
        """
        permissions = set()
        for backend in auth.get_backends():
            if hasattr(backend, "get_group_permissions"):
                permissions.update(backend.get_group_permissions(self, obj))
        return permissions

    def get_all_permissions(self, obj=None):
        return _user_get_all_permissions(self, obj)

    def has_perms(self, perm_list, obj=None):
        """
        Return True if the user has each of the specified permissions. If
        object is passed, check if the user has all required perms for it.
        """
        return all(self.has_perm(perm, obj) for perm in perm_list)

    def has_module_perms(self, app_label):
        """
        Return True if the user has any permissions in the given app label.
        Use similar logic as has_perm(), above.
        """
        # Active superusers have all permissions.
        if self.is_active and self.is_superuser:
            return True

        return _user_has_module_perms(self, app_label)


class AbstractUser(PermissionsMixin, AbstractBaseUser):
    """
    Users within the Orun authentication system are represented by this
    model.

    Username and password are required. Other fields are optional.
    """
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        _('username'),
        max_length=150,
        null=False,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[username_validator],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    password = models.PasswordField(_('password'), max_length=128)
    last_login = models.DateTimeField(_('last login'), null=True)
    # email = models.EmailField(_('email address'))
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
        null=False,
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
        null=False,
    )
    is_superuser = models.BooleanField(_('Is superuser'), default=False)
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        abstract = True
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    def email_user(self, subject, message, from_email=None, **kwargs):
        """Send an email to this user."""
        send_mail(subject, message, from_email, [self.email], **kwargs)


class AnonymousUser:
    id = None
    pk = None
    username = ''
    is_staff = False
    is_active = False
    is_superuser = False
    _groups = EmptyManager(Group)
    _user_permissions = EmptyManager(Permission)

    def __str__(self):
        return 'AnonymousUser'

    def __eq__(self, other):
        return isinstance(other, self.__class__)

    def __hash__(self):
        return 1  # instances always return the same hash value

    def __int__(self):
        raise TypeError('Cannot cast AnonymousUser to int. Are you trying to use it in place of User?')

    def save(self):
        raise NotImplementedError("Orun doesn't provide a DB representation for AnonymousUser.")

    def delete(self):
        raise NotImplementedError("Orun doesn't provide a DB representation for AnonymousUser.")

    def set_password(self, raw_password):
        raise NotImplementedError("Orun doesn't provide a DB representation for AnonymousUser.")

    def check_password(self, raw_password):
        raise NotImplementedError("Orun doesn't provide a DB representation for AnonymousUser.")

    @property
    def groups(self):
        return self._groups

    @property
    def user_permissions(self):
        return self._user_permissions

    def get_group_permissions(self, obj=None):
        return set()

    def get_all_permissions(self, obj=None):
        return _user_get_all_permissions(self, obj=obj)

    def has_perm(self, perm, obj=None):
        return _user_has_perm(self, perm, obj=obj)

    def has_perms(self, perm_list, obj=None):
        return all(self.has_perm(perm, obj) for perm in perm_list)

    def has_module_perms(self, module):
        return _user_has_module_perms(self, module)

    @property
    def is_anonymous(self):
        return True

    @property
    def is_authenticated(self):
        return False

    def get_username(self):
        return self.username


class UserGroups(models.Model):
    group = models.ForeignKey(Group, null=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=False)

    class Meta:
        name = 'auth.user.groups.rel'
