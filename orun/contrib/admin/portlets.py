from typing import List
import json

from orun.apps import apps
from orun.contrib.contenttypes.models import Registrable, ref
from .models.action import Action, WindowAction


class Portlet(Registrable):
    tag: str = None
    # kind = 'system'
    name: str = None
    description: str = None

    @classmethod
    def _get_info(cls):
        return {
            'tag': cls.tag,
            'name': cls.name,
            'description': cls.description,
            'type_name': cls.get_qualname(),
            'info': json.dumps(cls.get_info()),
        }

    @classmethod
    def get_info(cls):
        return {}

    @classmethod
    def update_info(cls):
        return cls._register_object(apps['ui.portlet'], cls.get_qualname(), cls._get_info())

    @classmethod
    def callback(cls, request):
        pass


class ModelActionPortlet(Portlet):
    model: str = None
    action: str = None

    @classmethod
    def _get_info(cls):
        res = super()._get_info()
        name = res['name']
        if not name:
            if cls.action:
                if isinstance(cls.action, str):
                    name = Action.get(ref(cls.action)).name
            if not name and cls.model:
                model = apps[cls.model]
                name = model._meta.verbose_name_plural
            res['name'] = name
        return res

    @classmethod
    def get_info(cls):
        action = cls.action
        if action is None:
            # get default window action
            action = WindowAction.from_model(cls.model).pk
        return {
            # 'kind': cls.kind,
            'model': cls.model,
            'action': action,
        }


class ModelWindowAction(ModelActionPortlet):
    tag = 'ModelAction'


class CreateNew(ModelWindowAction):
    tag = 'ModelCreateNew'


class GotoModel(ModelWindowAction):
    tag = 'GotoModel'
    view_type = 'list'

    @classmethod
    def get_info(cls):
        res = super().get_info()
        res['view_type'] = cls.view_type
        return res


class GotoReport(ModelActionPortlet):
    tag = 'ModelGotoReport'


class PortletGroup:
    name: str = None
    group = None
    portlets: List[Portlet] = []
