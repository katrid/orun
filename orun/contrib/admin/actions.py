from typing import List

from orun.apps import apps
from orun.db import models
from orun.db import DEFAULT_DB_ALIAS
from orun.contrib.contenttypes.models import ContentType, Object


class Action:
    schema: str = None
    no_update = False
    template_name: str = None
    usage: str = None
    description: str = None
    multiple = False

    def __init_subclass__(cls, **kwargs):
        module = cls.__module__
        app_config = apps.get_containing_app_config(module)
        if app_config:
            cls.schema = app_config.schema

    @classmethod
    def _update_info(cls):
        pass

    @classmethod
    def _register_object(cls, model, obj_name: str, info: dict, using=DEFAULT_DB_ALIAS):
        try:
            obj_id = Object.objects.get(name=obj_name)
            if cls.no_update != obj_id.can_update:
                obj_id.can_update = cls.no_update
                obj_id.save(using=using)
            instance = obj_id.content_object
            if instance is None:
                answer = input('The object "%s" is defined but not found on module "%s". Do you want to recreate it? [Y/n]' % (obj_name, obj_id.model_name))
                if answer == 'y' or not answer:
                    obj_id.delete()
                    raise Object.DoesNotExist
            if not cls.no_update:
                return instance
        except Object.DoesNotExist:
            instance = model()

        for k, v in info.items():
            field = instance._meta.fields.get(k)
            if field:
                k = field.attname
            setattr(instance, k, v)
        instance.save(using=using)

        Object.objects.create(
            schema=cls.schema,
            name=obj_name,
            object_id=instance.pk,
            model=ContentType.objects.get_by_natural_key(instance._meta.name),
            model_name=instance._meta.name,
            can_update=cls.no_update,
        )
        return instance

    @classmethod
    def get_id(cls):
        """Return id from database"""
        obj = apps['ir.object'].get_by_natural_key(cls.get_qualname())
        return obj.content_object.pk

    @classmethod
    def get_qualname(cls):
        return f'{cls.__module__}.{cls.__qualname__}'


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
