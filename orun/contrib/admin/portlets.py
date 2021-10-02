from typing import List
import json

from orun.apps import apps
from orun.contrib.contenttypes.models import Registrable, ref
from .models.action import WindowAction


class Portlet(Registrable):
    tag: str = None
    # kind = 'system'
    name: str = None
    description: str = None

    @classmethod
    def _get_info(cls):
        name = cls.name
        if name is None:
            model = apps[cls.model]
            name = model._meta.verbose_name_plural
        return {
            'tag': cls.tag,
            'name': name,
            'description': cls.description,
            'type_name': cls.get_qualname(),
            'info': json.dumps(cls.get_info()),
        }

    @classmethod
    def get_info(cls):
        return {}

    @classmethod
    def _update_info(cls):
        return cls._register_object(apps['ui.portlet'], cls.get_qualname(), cls._get_info())

    @classmethod
    def callback(cls, request):
        pass


class ModelWindowAction(Portlet):
    tag = 'portlet-model-window-action'
    model: str = None
    action: str = None

    @classmethod
    def get_info(cls):
        action = cls.action
        if action is None:
            # get default window action
            action = WindowAction.from_model(cls.model).pk
        elif isinstance(action, str):
            action = ref(action)
        return {
            # 'kind': cls.kind,
            'model': cls.model,
            'action': action,
        }


class CreateNew(ModelWindowAction):
    tag = 'portlet-create-new'


class GotoModel(ModelWindowAction):
    tag = 'portlet-goto-model'
    view_type = 'list'

    @classmethod
    def get_info(cls):
        res = super().get_info()
        res['view_type'] = cls.view_type
        return res


class PortletGroup:
    name: str = None
    group = None
    portlets: List[Portlet] = []
