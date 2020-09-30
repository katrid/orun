from orun.apps import AppConfig
from orun.core import checks
from orun.db.models.query_utils import DeferredAttribute
from orun.db.models.signals import post_migrate
from orun.utils.translation import gettext_lazy as _
from orun.apps import apps

from .checks import check_models_permissions, check_user_model
from .management import create_permissions
from .signals import user_logged_in


class AuthConfig(AppConfig):
    name = 'orun.contrib.auth'
    verbose_name = _("Authentication and Authorization")
    dependencies = ['orun.contrib.contenttypes']

    def ready(self):
        post_migrate.connect(
            create_permissions,
            dispatch_uid="orun.contrib.auth.management.create_permissions"
        )
        last_login_field = apps['auth.user'].last_login
        # Register the handler only if UserModel.last_login is a field.
        if isinstance(last_login_field, DeferredAttribute):
            from .models import update_last_login
            user_logged_in.connect(update_last_login, dispatch_uid='update_last_login')
        checks.register(check_user_model, checks.Tags.models)
        checks.register(check_models_permissions, checks.Tags.models)
