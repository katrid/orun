from orun.contrib.contenttypes.models import ContentType, Object, Registrable
from .actions import Action


class ReportAction(Action):
    model: str = None
    report_type = 'banded'
    name: str = None

    @classmethod
    def update_info(cls):
        import orun.contrib.admin.models
        # view auto registration
        target_model = (cls.model and ContentType.objects.only('pk').get(name=cls.model)) or None
        report_info = {
            'report_type': cls.report_type,
            'name': cls.name or cls.__name__,
            'model': target_model,
            'qualname': cls.get_qualname(),
        }
        return cls._register_object(
            orun.contrib.admin.models.ReportAction, cls.get_qualname(), report_info
        )


