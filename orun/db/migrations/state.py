import copy
from collections import OrderedDict
from contextlib import contextmanager

from orun import app
from orun.apps import AppConfig
from orun.apps import Registry as Apps, apps as global_apps
from orun.db import models
from orun.db.models.options import DEFAULT_NAMES, normalize_together
from orun.utils.encoding import force_text, smart_text
from orun.utils.functional import cached_property
from orun.utils.module_loading import import_string
from orun.utils.version import get_docs_version
from .exceptions import InvalidBasesError


def _get_app_label_and_model_name(model, app_label=''):
    if isinstance(model, str):
        split = model.split('.', 1)
        return (tuple(split) if len(split) == 2 else (app_label, split[0]))
    else:
        return model._meta.app_label, model._meta.model_name


def get_related_models_recursive(model):
    """
    Returns all models that have a direct or indirect relationship
    to the given model.

    Relationships are either defined by explicit relational fields, like
    ForeignKey, ManyToManyField or OneToOneField, or by inheriting from another
    model (a superclass is related to its subclasses, but not vice versa). Note,
    however, that a model inheriting from a concrete model is also related to
    its superclass through the implicit *_ptr OneToOneField on the subclass.
    """
    def _related_models(m):
        return [
            f.related_model for f in m._meta.fields
            if f.is_relation and f.related_model is not None and not isinstance(f.related_model, str)
        ] + [
            subclass for subclass in m.__subclasses__()
            if issubclass(subclass, models.Model)
        ]

    seen = set()
    queue = _related_models(model)
    for rel_mod in queue:
        rel_app_label, rel_model_name = rel_mod._meta.app_label, rel_mod._meta.model_name
        if (rel_app_label, rel_model_name) in seen:
            continue
        seen.add((rel_app_label, rel_model_name))
        queue.extend(_related_models(rel_mod))
    return seen - {(model._meta.app_label, model._meta.model_name)}


class ProjectState(object):
    """
    Represents the entire project's overall state.
    This is the item that is passed around - we do it here rather than at the
    app level so that cross-app FKs/etc. resolve properly.
    """

    def __init__(self, models=None, real_apps=None):
        self.models = models or {}
        self.schemas = {}
        # Apps to include from main registry, usually unmigrated ones
        self.real_apps = real_apps or []

    def add_model(self, model_state):
        app_label, model_name = model_state.app_label, model_state.name_lower
        self.models[(app_label, model_name)] = model_state
        if 'apps' in self.__dict__:  # hasattr would cache the property
            self.reload_model(app_label, model_name)

    def remove_model(self, app_label, model_name):
        del self.models[app_label, model_name]
        if 'apps' in self.__dict__:  # hasattr would cache the property
            self.apps.unregister_model(app_label, model_name)
            # Need to do this explicitly since unregister_model() doesn't clear
            # the cache automatically (#24513)
            self.apps.clear_cache()

    def reload_model(self, app_label, model_name):
        if 'apps' in self.__dict__:  # hasattr would cache the property
            try:
                old_model = self.apps.get_model(app_label, model_name)
            except LookupError:
                related_models = set()
            else:
                # Get all relations to and from the old model before reloading,
                # as _meta.apps may change
                related_models = get_related_models_recursive(old_model)

            # Get all outgoing references from the model to be rendered
            model_state = self.models[(app_label, model_name)]
            # Directly related models are the models pointed to by ForeignKeys,
            # OneToOneFields, and ManyToManyFields.
            direct_related_models = set()
            for name, field in model_state.fields:
                if field.is_relation:
                    #rel_app_label, rel_model_name = _get_app_label_and_model_name(field.related_model, app_label)
                    rel_app_label, rel_model_name = app_label, field.related_model
                    direct_related_models.add((rel_app_label, rel_model_name.lower()))

            # For all direct related models recursively get all related models.
            related_models.update(direct_related_models)
            for rel_app_label, rel_model_name in direct_related_models:
                try:
                    rel_model = self.apps.get_model(rel_app_label, rel_model_name)
                except LookupError:
                    pass
                else:
                    related_models.update(get_related_models_recursive(rel_model))

            # Include the model itself
            related_models.add((app_label, model_name))

            # Unregister all related models
            with self.apps.bulk_update():
                for rel_app_label, rel_model_name in related_models:
                    self.apps.unregister_model(rel_app_label, rel_model_name)

            states_to_be_rendered = []
            # Gather all models states of those models that will be rerendered.
            # This includes:
            # 1. All related models of unmigrated apps
            for model_state in self.apps.real_models:
                if (model_state.app_label, model_state.name_lower) in related_models:
                    states_to_be_rendered.append(model_state)

            # 2. All related models of migrated apps
            for rel_app_label, rel_model_name in related_models:
                try:
                    model_state = self.models[rel_app_label, rel_model_name]
                except KeyError:
                    pass
                else:
                    states_to_be_rendered.append(model_state)

            # Render all models
            self.apps.render_multiple(states_to_be_rendered)

    def clone(self):
        "Returns an exact copy of this ProjectState"
        new_state = ProjectState(
            models={k: v.clone() for k, v in self.models.items()},
            real_apps=self.real_apps,
        )
        if 'apps' in self.__dict__:
            new_state.apps = self.apps.clone()
        return new_state

    @cached_property
    def apps(self):
        return StateApps(self.real_apps, self.models)

    @property
    def concrete_apps(self):
        self.apps = StateApps(self.real_apps, self.models, ignore_swappable=True)
        return self.apps

    @classmethod
    def from_apps(cls, apps):
        "Takes in an Apps and returns a ProjectState matching it"
        app_models = {}
        for model in apps.get_models():
            model_state = ModelState.from_model(model)
            app_models[(model_state.app_label, model_state.name_lower)] = model_state
        return cls(app_models)

    def __eq__(self, other):
        if set(self.models.keys()) != set(other.models.keys()):
            return False
        if set(self.real_apps) != set(other.real_apps):
            return False
        return all(model == other.models[key] for key, model in self.models.items())

    def __ne__(self, other):
        return not (self == other)


class AppConfigStub(AppConfig):
    """
    Stubs a Orun AppConfig. Only provides a label, and a dict of models.
    """
    # Not used, but required by AppConfig.__init__
    path = ''

    def __init__(self, label):
        self.schema = label
        # App-label and app-name are not the same thing, so technically passing
        # in the label here is wrong. In practice, migrations don't care about
        # the app name, but we need something unique, and the label works fine.
        super(AppConfigStub, self).__init__(label, None, registry=None)

    def import_models(self, all_models):
        self.models = all_models


class StateApps(Apps):
    """
    Subclass of the global Apps registry class to better handle dynamic model
    additions and removals.
    """
    def __init__(self, real_apps, models, ignore_swappable=False):
        # Any apps in self.real_apps should have all their models included
        # in the render. We don't use the original model instances as there
        # are some variables that refer to the Apps object.
        # FKs/M2Ms from real apps are also not included as they just
        # mess things up with partial states (due to lack of dependencies)
        self.real_models = []
        for app_label in real_apps:
            app = global_apps.get_app_config(app_label)
            for model in app.get_models():
                self.real_models.append(ModelState.from_model(model, exclude_rels=True))
        # Populate the app registry with a stub for each application.
        app_labels = {model_state.app_label for model_state in models.values()}
        app_configs = {label: AppConfigStub(label) for label in sorted(real_apps + list(app_labels))}
        super(StateApps, self).__init__(app_configs)

        self.render_multiple(list(models.values()) + self.real_models)

        # There shouldn't be any operations pending at this point.
        pending_models = set(self._pending_operations)
        #if pending_models:
        #    raise ValueError(self._pending_models_error(pending_models))

    def _pending_models_error(self, pending_models):
        """
        Almost all internal uses of lazy operations are to resolve string model
        references in related fields. We can extract the fields from those
        operations and use them to provide a nicer error message.

        This will work for any function passed to lazy_related_operation() that
        has a keyword argument called 'field'.
        """
        def extract_field(operation):
            # operation is annotated with the field in
            # apps.registry.Apps.lazy_model_operation().
            return getattr(operation, 'field', None)

        def extract_field_names(operations):
            return (str(field) for field in map(extract_field, operations) if field)

        get_ops = self._pending_operations.__getitem__
        # Ordered list of pairs of the form
        # ((app_label, model_name), [field_name_1, field_name_2, ...])
        models_fields = sorted(
            (model_key, sorted(extract_field_names(get_ops(model_key))))
            for model_key in pending_models
        )

        def model_text(model_key, fields):
            field_list = ", ".join(fields)
            field_text = " (referred to by fields: %s)" % field_list if fields else ""
            return ("%s.%s" % model_key) + field_text

        msg = "Unhandled pending operations for models:"
        return "\n  ".join([msg] + [model_text(*i) for i in models_fields])

    @contextmanager
    def bulk_update(self):
        # Avoid clearing each model's cache for each change. Instead, clear
        # all caches when we're finished updating the model instances.
        ready = self.ready
        self.ready = False
        try:
            yield
        finally:
            self.ready = ready

    def render_multiple(self, model_states):
        # We keep trying to render the models in a loop, ignoring invalid
        # base errors, until the size of the unrendered models doesn't
        # decrease by at least one, meaning there's a base dependency loop/
        # missing base.
        if not model_states:
            return
        # Prevent that all model caches are expired for each render.
        with self.bulk_update():
            unrendered_models = model_states
            while unrendered_models:
                new_unrendered_models = []
                for model in unrendered_models:
                    try:
                        model.render(self)
                    except InvalidBasesError:
                        new_unrendered_models.append(model)
                if len(new_unrendered_models) == len(unrendered_models):
                    raise InvalidBasesError(
                        "Cannot resolve bases for %r\nThis can happen if you are inheriting models from an "
                        "app with migrations (e.g. contrib.auth)\n in an app with no migrations; see "
                        "https://docs.djangoproject.com/en/%s/topics/migrations/#dependencies "
                        "for more" % (new_unrendered_models, get_docs_version())
                    )
                unrendered_models = new_unrendered_models

    def clone(self):
        """
        Return a clone of this registry, mainly used by the migration framework.
        """
        clone = StateApps([], {})
        clone.all_models = copy.deepcopy(self.all_models)
        clone.module_models = copy.deepcopy(self.module_models)
        clone.app_configs = copy.deepcopy(self.app_configs)
        # No need to actually clone them, they'll never change
        clone.real_models = self.real_models
        return clone

    def register_model(self, app_label, model):
        self.all_models[model._meta.name] = model
        self.module_models[app_label][model.__name__.lower()] = model
        if app_label not in self.app_configs:
            self.app_configs[app_label] = AppConfigStub(app_label)
            self.app_configs[app_label].models = OrderedDict()
        self.app_configs[app_label].models[model._meta.name] = model
        #self.do_pending_operations(model)
        #self.clear_cache()

    def unregister_model(self, app_label, model_name):
        try:
            model = self.module_models[app_label][model_name]
            del self.all_models[model._meta.name]
            del self.module_models[app_label][model_name]
        except KeyError:
            pass


class ModelState(object):
    """
    Represents a Orun Model. We don't use the actual Model class
    as it's not designed to have its options changed - instead, we
    mutate this one and then render it into a Model as required.

    Note that while you are allowed to mutate .fields, you are not allowed
    to mutate the Field instances inside there themselves - you must instead
    assign new ones, as these are not detached during a clone.
    """

    def __init__(self, app_label, name, fields, options=None, bases=None, managers=None):
        self.app_label = app_label
        self.name = force_text(name)
        self.fields = fields
        self.options = options or {}
        self.bases = bases or (models.Model, )
        self.managers = managers or []
        # Sanity-check that fields is NOT a dict. It must be ordered.
        if isinstance(self.fields, dict):
            raise ValueError("ModelState.fields cannot be a dict - it must be a list of 2-tuples.")
        for name, field in fields:
            # Sanity-check that fields are NOT already bound to a model.
            if hasattr(field, 'model'):
                raise ValueError(
                    'ModelState.fields cannot be bound to a model - "%s" is.' % name
                )
            # Sanity-check that relation fields are NOT referring to a model class.
            if field.is_relation and hasattr(field.related_model, '_meta'):
                raise ValueError(
                    'ModelState.fields cannot refer to a model class - "%s.to" does. '
                    'Use a string reference instead.' % name
                )
            # if field.many_to_many and hasattr(field.remote_field.through, '_meta'):
            #     raise ValueError(
            #         'ModelState.fields cannot refer to a model class - "%s.through" does. '
            #         'Use a string reference instead.' % name
            #     )

    @cached_property
    def name_lower(self):
        return self.name.lower()

    @classmethod
    def from_model(cls, model, exclude_rels=False):
        """
        Feed me a model, get a ModelState representing it out.
        """
        # Deconstruct the fields
        fields = []
        for field in model._meta.local_fields:
            if (getattr(field, "remote_field", None) and exclude_rels) or \
                    field.inherited or \
                    (not isinstance(field, models.ManyToManyField) and not field.db_column):
                continue
            name = force_text(field.name, strings_only=True)
            if not model._meta.extension or (model._meta.extension and field.model == model):
                try:
                    fields.append((name, field.clone()))
                except TypeError as e:
                    raise TypeError("Couldn't reconstruct field %s on %s: %s" % (
                        name,
                        model._meta.label,
                        e,
                    ))
        # Extract the options
        options = {}
        for name in DEFAULT_NAMES:
            # Ignore some special options
            if name in model._meta.meta_attrs:
                if name == "unique_together":
                    ut = model._meta.meta_attrs["unique_together"]
                    options[name] = set(normalize_together(ut))
                elif name == "index_together":
                    it = model._meta.meta_attrs["index_together"]
                    options[name] = set(normalize_together(it))
                else:
                    options[name] = model._meta.meta_attrs[name]
        # Force-convert all options to text_type (#23226)
        options = cls.force_text_recursive(options)
        # If we're ignoring relationships, remove all field-listing model
        # options (that option basically just means "make a stub model")
        if exclude_rels:
            for key in ["unique_together", "index_together", "order_with_respect_to"]:
                if key in options:
                    del options[key]
        options['name'] = model._meta.name
        options['db_table'] = model._meta.db_table
        if model._meta.db_schema:
            options['db_schema'] = model._meta.db_schema
        if model._meta.extension:
            options['extension'] = model._meta.extension
        options['abstract'] = model._meta.abstract
        if not model._meta.managed:
            options['managed'] = model._meta.managed

        def flatten_bases(model):
            bases = []
            for base in model.__bases__:
                if hasattr(base, "_meta") and base._meta.abstract:
                    bases.extend(flatten_bases(base))
                else:
                    bases.append(base)
            return bases

        # We can't rely on __mro__ directly because we only want to flatten
        # abstract models and not the whole tree. However by recursing on
        # __bases__ we may end up with duplicates and ordering issues, we
        # therefore discard any duplicates and reorder the bases according
        # to their index in the MRO.
        flattened_bases = sorted(set(flatten_bases(model)), key=lambda x: model.__mro__.index(x))

        # Make our record
        bases = tuple(
            (
                base._meta.label_lower
                if hasattr(base, "_meta") else
                base
            )
            for base in flattened_bases
        )
        # Ensure at least one base inherits from models.Model
        if not any((isinstance(base, str) or issubclass(base, models.Model)) for base in bases):
            bases = (models.Model,)

        # Construct the new ModelState
        return cls(
            model._meta.app_label,
            model.__name__,
            fields,
            options,
            bases,
        )

    @classmethod
    def force_text_recursive(cls, value):
        if isinstance(value, str):
            return smart_text(value)
        elif isinstance(value, list):
            return [cls.force_text_recursive(x) for x in value]
        elif isinstance(value, tuple):
            return tuple(cls.force_text_recursive(x) for x in value)
        elif isinstance(value, set):
            return set(cls.force_text_recursive(x) for x in value)
        elif isinstance(value, dict):
            return {
                cls.force_text_recursive(k): cls.force_text_recursive(v)
                for k, v in value.items()
            }
        return value

    def construct_managers(self):
        "Deep-clone the managers using deconstruction"
        # Sort all managers by their creation counter
        sorted_managers = sorted(self.managers, key=lambda v: v[1].creation_counter)
        for mgr_name, manager in sorted_managers:
            mgr_name = force_text(mgr_name)
            as_manager, manager_path, qs_path, args, kwargs = manager.deconstruct()
            if as_manager:
                qs_class = import_string(qs_path)
                yield mgr_name, qs_class.as_manager()
            else:
                manager_class = import_string(manager_path)
                yield mgr_name, manager_class(*args, **kwargs)

    def clone(self):
        "Returns an exact copy of this ModelState"
        return self.__class__(
            app_label=self.app_label,
            name=self.name,
            fields=list(self.fields),
            options=dict(self.options),
            bases=self.bases,
            managers=list(self.managers),
        )

    def render(self, apps):
        "Creates a Model object from our current state into the given apps"
        # First, make a Meta object
        meta_contents = {'app_label': self.app_label, "apps": apps, "__register__": True}
        meta_contents.update(self.options)
        meta = type(str("Meta"), tuple(), meta_contents)
        # Then, work out our bases
        try:
            bases = tuple(
                (apps.get_model(*base.split('.', 1)) if isinstance(base, str) else base)
                for base in self.bases
            )
        except LookupError:
            raise InvalidBasesError("Cannot resolve one or more bases from %r" % (self.bases,))
        # Turn fields into a dict for the body, add other bits
        body = {name: field.clone() for name, field in self.fields}
        body['Meta'] = meta
        body['__module__'] = "__fake__"

        # Restore managers
        #body.update(self.construct_managers())

        # Then, make a Model object (apps.register_model is called in __new__)
        model = type(
            str(self.name),
            bases,
            body,
        )
        model._meta.app = app
        return model

    def get_field_by_name(self, name):
        for fname, field in self.fields:
            if fname == name:
                return field
        raise ValueError("No field called %s on model %s" % (name, self.name))

    def __repr__(self):
        return "<ModelState: '%s.%s'>" % (self.app_label, self.name)

    def __eq__(self, other):
        return (
            (self.app_label == other.app_label) and
            (self.name == other.name) and
            (len(self.fields) == len(other.fields)) and
            all((k1 == k2 and (f1.deconstruct()[1:] == f2.deconstruct()[1:]))
                for (k1, f1), (k2, f2) in zip(self.fields, other.fields)) and
            (self.options == other.options) and
            (self.bases == other.bases) and
            (self.managers == other.managers)
        )

    def __ne__(self, other):
        return not (self == other)
