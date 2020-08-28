from orun.apps import apps as global_apps
from orun.db import DEFAULT_DB_ALIAS, router, transaction
from orun.db.utils import IntegrityError


def get_contenttypes_and_models(model, using, ContentType):
    if not router.allow_migrate_model(using, ContentType):
        return None, None

    ContentType.objects.clear_cache()

    content_type = ContentType.objects.using(using).filter(name=model._meta.name)
    return content_type


def create_contenttypes(addon, verbosity=2, interactive=True, using=DEFAULT_DB_ALIAS, apps=global_apps, **kwargs):
    """
    Create content types for models in the given app.
    """
    models = kwargs['models']
    try:
        ContentType = apps['content.type']
    except LookupError:
        return

    # TODO use bulk create instead
    for model in models:
        app_models = get_contenttypes_and_models(model, using, ContentType)

        if app_models:
            return

        ContentType.objects.using(using).create(
            schema=model._meta.schema,
            name=model._meta.name,
            verbose_name=model._meta.verbose_name,
            verbose_name_plural=model._meta.verbose_name_plural,
            object_name=model._meta.object_name,
        )
        if verbosity >= 2:
            print("Adding content type '%s | %s'" % (addon.schema, model._meta.name))
