from orun.apps import apps
from orun.db import models
from orun.db import DEFAULT_DB_ALIAS
from orun.contrib.contenttypes.models import ContentType, Object


class Action:
    no_update = False
    template_name: str = None

    def _update_info(self):
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
        return instance


class Window(Action):
    model: str = None


class Report(Action):
    model: str = None
    report_type = 'paginated'
    name: str = None

    @classmethod
    def _update_info(cls):
        # view auto registration
        target_model = (cls.model and ContentType.objects.only('pk').get(name=cls.model)) or None
        view_id = f'{cls.__qualname__}.view'
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
        return cls._register_object(apps['ui.action.report'], cls.__qualname__, report_info)
