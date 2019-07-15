from orun.core.exceptions import ObjectDoesNotExist


def register_model(model):
    ContentType = model._meta.app['ir.model']
    try:
        ContentType.get_by_natural_key(model._meta.name)
    except ObjectDoesNotExist:
        ContentType.create(
            name=model._meta.name,
            object_name=model._meta.object_name,
            object_type='base',
        )

#
# def _register_models(app_config, verbosity=2, interactive=True, using=DEFAULT_DB_ALIAS, **kwargs):
#     """
#     Creates content types for models in the given app, removing any model
#     entries that no longer have a matching model class.
#     """
#     if not app_config.models_module:
#         return
#
#     try:
#         Model = app['ir.model']
#     except LookupError:
#         return
#
#     # TODO database router
#     # if not router.allow_migrate_model(using, Model):
#     #    return
#
#     app_label = app_config.schema
#
#     app_models = {
#         model._meta.model_name: model
#         for model in app_config.get_models()}
#
#     if not app_models:
#         return
#
#     # Get all the content types
#     content_types = {
#         ct.object_name: ct
#         for ct in Model.objects.using(using).filter(app_label=app_label)
#     }
#     to_remove = [
#         ct
#         for (model_name, ct) in content_types.items()
#         if model_name not in app_models
#     ]
#
#     cts = [
#         Model(
#             name=model._meta.name,
#             app_label=app_label,
#             object_name=model_name,
#             object_type='base',
#         )
#         for (model_name, model) in app_models.items()
#         if model_name not in content_types
#     ]
#     Model.objects.using(using).bulk_create(cts)
#     if verbosity >= 2:
#         for ct in cts:
#             print("Adding content type '%s | %s'" % (ct.app_label, ct.model))
#
#     # Confirm that the content type is stale before deletion.
#     if to_remove:
#         if interactive:
#             content_type_display = '\n'.join(
#                 '    %s | %s' % (ct.app_label, ct.model)
#                 for ct in to_remove
#             )
#             ok_to_delete = input("""The following content types are stale and need to be deleted:
#
# %s
#
# Any objects related to these content types by a foreign key will also
# be deleted. Are you sure you want to delete these content types?
# If you're unsure, answer 'no'.
#
#     Type 'yes' to continue, or 'no' to cancel: """ % content_type_display)
#         else:
#             ok_to_delete = False
#
#         if ok_to_delete == 'yes':
#             for ct in to_remove:
#                 if verbosity >= 2:
#                     print("Deleting stale content type '%s | %s'" % (ct.app_label, ct.model))
#                 ct.delete()
#         else:
#             if verbosity >= 2:
#                 print("Stale content types remain.")
