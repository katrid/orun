from orun.apps import apps as global_apps
from orun.db import DEFAULT_DB_ALIAS, router, transaction


def get_contenttypes_and_models(model, using, ContentType):
    if not router.allow_migrate_model(using, ContentType):
        return None, None

    ContentType.objects.clear_cache()

    content_type = ContentType.objects.using(using).filter(name=model._meta.name).first()
    return content_type


def create_contenttypes(app_models, verbosity=2, interactive=True, using=DEFAULT_DB_ALIAS, apps=global_apps, **kwargs):
    """
    Create content types for models in the given app.
    """
    from orun.contrib.contenttypes.models import ContentType
    created_models = []
    for schema, models in app_models:
        app_config = apps.app_configs[schema]

        for model in models:
            ct = get_contenttypes_and_models(model, using, ContentType)

            if ct:
                continue

            ct = ContentType.objects.using(using).create(
                name=model._meta.name,
            )
            created_models.append(ct)
            if verbosity >= 2:
                print("Adding content type '%s | %s'" % (app_config.schema, model._meta.name))
