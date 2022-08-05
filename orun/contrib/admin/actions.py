from typing import List

from orun.apps import apps
from orun.db import models
from orun.db import DEFAULT_DB_ALIAS
from orun.utils.translation import gettext
from orun.contrib.contenttypes.models import ContentType, Object, Registrable


class Action(Registrable):
    action_type: str = None
    name: str = None
    schema: str = None
    template_name: str = None
    usage: str = None
    description: str = None
    multiple = False

    @classmethod
    def update_info(cls):
        action_info = {'name': cls.name or cls.__name__, 'qualname': cls.get_qualname()}
        return cls._register_object(apps[cls.action_type], cls.get_qualname(), action_info)


class WindowAction(Action):
    model: str = None
    name: str = None
    domain: dict = None
    view_mode: List[str] = ['list', 'form']
    view_type = 'form'

    @classmethod
    def update_info(cls):
        if cls.model not in apps.models:
            print('model not found', cls.model)
            return
        model = apps[cls.model]
        name = cls.name or model._meta.verbose_name_plural
        action_info = {
            'usage': cls.usage,
            'description': cls.description,
            'name': name,
            'model': cls.model,
            'view_model': cls.view_mode,
            'view_type': cls.view_type,
        }
        return cls._register_object(apps['ui.action.window'], cls.get_qualname(), action_info)


class ReportAction(Action):
    model: str = None
    report_type = 'banded'
    name: str = None

    @classmethod
    def update_info(cls):
        import orun.contrib.admin.models
        # view auto registration
        target_model = (cls.model and ContentType.objects.only('pk').get(name=cls.model)) or None
        # view_id = f'{cls.get_qualname()}.view'
        # view_info = {
        #     'view_type': 'report',
        #     'template_name': cls.template_name,
        #     'name': view_id,
        #     'model': target_model,
        # }
        # view = cls._register_object(apps['ui.view'], view_id, view_info)
        report_info = {
            'report_type': cls.report_type,
            'name': cls.name or cls.__name__,
            # 'view': view,
            'model': target_model,
            'qualname': cls.get_qualname(),
        }
        return cls._register_object(
            orun.contrib.admin.models.ReportAction, cls.get_qualname(), report_info
        )


class ViewAction(Action):
    action_type = 'ui.action.view'
    template_name: str = None

    @classmethod
    def get_context(cls, request):
        return {}

    @classmethod
    def render(cls, request):
        from orun.template.loader import get_template
        from orun.contrib.admin.models.ui import exec_query, exec_scalar, ref, query
        ctx = cls.get_context(request)
        ctx['env'] = apps
        ctx['_'] = gettext
        ctx['exec_query'] = exec_query
        ctx['query'] = query
        ctx['exec_scalar'] = exec_scalar
        ctx['models'] = apps
        ctx['ref'] = ref
        return {
            'content': get_template(cls.template_name).render(ctx),
        }

