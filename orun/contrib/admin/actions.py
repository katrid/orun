from typing import List

from orun.apps import apps
from orun.db import models
from orun.db import DEFAULT_DB_ALIAS
from orun.contrib.contenttypes.models import ContentType, Object, Registrable


class Action(Registrable):
    schema: str = None
    template_name: str = None
    usage: str = None
    description: str = None
    multiple = False

    @classmethod
    def _update_info(cls):
        pass

    @classmethod
    def get_id(cls):
        """Return id from database"""
        obj = apps['ir.object'].get_by_natural_key(cls.get_qualname())
        return obj.content_object.pk


class WindowAction(Action):
    model: str = None
    name: str = None
    domain: dict = None
    view_mode: List[str] = ['list', 'form']
    view_type = 'form'

    @classmethod
    def _update_info(cls):
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
    report_type = 'paginated'
    name: str = None

    @classmethod
    def _update_info(cls):
        # view auto registration
        target_model = (cls.model and ContentType.objects.only('pk').get(name=cls.model)) or None
        view_id = f'{cls.get_qualname()}.view'
        view_info = {
            'view_type': 'report',
            'template_name': cls.template_name,
            'name': view_id,
            'model': target_model,
        }
        view = cls._register_object(apps['ui.view'], view_id, view_info)
        report_info = {
            'report_type': cls.report_type,
            'name': cls.name or cls.__name__,
            'view': view,
            'model': target_model,
        }
        return cls._register_object(apps['ui.action.report'], cls.get_qualname(), report_info)
