from orun.apps import apps
from orun.conf import settings
from orun.db.models.fields import DateTimeField
from orun.db.models.fields.related import ForeignKey
from orun.utils.translation import gettext_lazy as _
from . import current_user_id


class BaseAuditBackend:
    @classmethod
    def prepare_meta_class(cls, opts):
        pass


class AuthAuditBackend(BaseAuditBackend):
    @classmethod
    def prepare_meta_class(cls, opts):
        fields = opts.local_fields
        user_model = settings.AUTH_USER_MODEL
        fields['created_by'] = ForeignKey(
            user_model, verbose_name=_('Created by'),
            on_insert_value=current_user_id,
            auto_created=True, editable=False, deferred=True, db_index=False, copy=False,
            db_constraint=False,
        )
        fields['created_on'] = DateTimeField(
            auto_now_add=True, verbose_name=_('Created on'),
            auto_created=True, editable=False, deferred=True, copy=False
        )
        fields['updated_by'] = ForeignKey(
            user_model, verbose_name=_('Updated by'),
            on_update_value=current_user_id,
            auto_created=True, editable=False, deferred=True, db_index=False, copy=False,
            db_constraint=False,
        )
        fields['updated_on'] = DateTimeField(
            auto_now=True, verbose_name=_('Updated on'),
            auto_created=True, editable=False, deferred=True, copy=False
        )

