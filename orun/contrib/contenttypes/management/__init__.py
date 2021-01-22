from orun.apps import apps as global_apps
from orun.db import DEFAULT_DB_ALIAS, router, transaction
from orun.db.utils import IntegrityError


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
    try:
        ContentType = apps['content.type']
        Field = apps['content.field']
    except LookupError:
        return
    created_models = []
    for schema, models in app_models:
        app_config = apps.app_configs[schema]

        # TODO use bulk create instead
        for model in models:
            ct = get_contenttypes_and_models(model, using, ContentType)

            if ct:
                continue

            ct = ContentType.objects.using(using).create(
                schema=model._meta.schema,
                name=model._meta.name,
                verbose_name=model._meta.verbose_name,
                verbose_name_plural=model._meta.verbose_name_plural,
                object_name=model._meta.object_name,
            )
            created_models.append(ct)
            if verbosity >= 2:
                print("Adding content type '%s | %s'" % (app_config.schema, model._meta.name))
    for model in created_models:
        ct = get_contenttypes_and_models(model, using, ContentType)
        for f in model._meta.fields:
            ct.create_field(f)
