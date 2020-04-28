import datetime
import inspect
import warnings
import copy
from functools import partialmethod, reduce
from itertools import chain

from orun.apps import apps
from orun import api
from orun.conf import settings
from orun.core import checks
from orun.core.exceptions import (
    NON_FIELD_ERRORS, FieldDoesNotExist, FieldError, MultipleObjectsReturned,
    ObjectDoesNotExist, ValidationError,
)
from orun.db import (
    DEFAULT_DB_ALIAS, ORUN_VERSION_PICKLE_KEY, DatabaseError, connection,
    connections, router, transaction,
)
from orun.db.models.constants import LOOKUP_SEP
from orun.db.models.constraints import CheckConstraint, UniqueConstraint
from orun.db.models.deletion import CASCADE, Collector
from orun.db.models.fields import BaseField, Field, BigAutoField, CharField, DateTimeField
from orun.db.models import Q
from orun.db.models.fields.related import (
    ForeignObjectRel, ForeignKey, OneToOneField, lazy_related_operation,
)
from orun.db.models.manager import Manager
from orun.db.models.options import Options
from orun.db.models.query import Q
from orun.db.models.aggregates import Count
from orun.db.models.signals import (
    class_prepared, post_init, post_save, pre_init, pre_save,
)
from orun.utils.encoding import force_str
from orun.utils.text import capfirst, get_text_list
from orun.utils.translation import gettext_lazy as _, gettext
from orun.utils.version import get_version
from orun.utils.xml import get_xml_fields, etree
from orun.db.models.fields import NOT_PROVIDED, BooleanField


class Deferred:
    def __repr__(self):
        return '<Deferred field>'

    def __str__(self):
        return '<Deferred field>'


CHOICES_PAGE_LIMIT = 100
DEFERRED = Deferred()


def subclass_exception(name, bases, module, attached_to):
    """
    Create exception subclass. Used by ModelBase below.

    The exception is created in a way that allows it to be pickled, assuming
    that the returned exception class will be added as an attribute to the
    'attached_to' class.
    """
    return type(name, bases, {
        '__module__': module,
        '__qualname__': '%s.%s' % (attached_to.__qualname__, name),
    })


def _has_contribute_to_class(value):
    # Only call contribute_to_class() if it's bound.
    return not inspect.isclass(value) and hasattr(value, 'contribute_to_class')


# TODO add store option to related/proxy field
# TODO add related/proxy field to ForeignKey, OneToManyField and ManyToManyField
# TODO add field compute operation (maybe use getter with api records)
# TODO store generic foreign key values to database
class ModelBase(type):
    """Metaclass for all models."""
    Meta: Options = None
    _meta: Options = None
    __model__ = None

    def __new__(cls, name, bases, attrs):
        super_new = super().__new__

        if not bases:
            return super_new(cls, name, bases, attrs)

        meta = attrs.pop('Meta', None)
        registry = apps
        if meta:
            registry = getattr(meta, 'apps', registry)
        app = attrs.get('__app__')
        addon = getattr(meta, 'addon', None)
        parents = [b for b in bases if isinstance(b, ModelBase) and b.Meta]

        if app is None:
            module = attrs.get('__module__')
            new_attrs = {'__module__': module}

            # Look for an application configuration to attach the model to.
            addon = apps.get_containing_app_config(module)

            if addon:
                schema = addon.schema
            else:
                schema = module.split('.', 1)[0]
                addon = registry[schema]

            overriding = getattr(meta, 'overriding', None)
            override = getattr(meta, 'override', bool(overriding))
            if overriding:
                bases = (overriding,) + bases
                parents.insert(0, overriding)

            contributable_attrs = {}
            for obj_name, obj in list(attrs.items()):
                if _has_contribute_to_class(obj):
                    contributable_attrs[obj_name] = obj
                else:
                    new_attrs[obj_name] = obj

            new_class: ModelBase = super_new(cls, name, bases, new_attrs)
            meta_attrs = {
                'addon': addon,
                'override': override,
            }
            if not override:
                meta_attrs['schema'] = schema
            opts = Options.from_model(meta, new_class, parents, meta_attrs)
            if override and opts.inherits:
                opts.inherits.Meta.overrides.append(new_class)
            if overriding:
                opts.inherits.Meta.swapped = True
            new_class.Meta = opts
            opts.contributable_attrs = contributable_attrs

            attr_items = attrs.items()
            if opts.override:
                opts.inherits.Meta.swapped = True
            if opts.proxy or opts.override:
                opts.parents = opts.inherits.Meta.parents

            # Check if primary key is needed
            if not opts.override and not opts.abstract:
                pk = None
                for k, attr in attr_items:
                    if isinstance(attr, Field) and attr.primary_key:
                        opts.pk = pk = attr
                if pk is None and not opts.proxy:
                    if parents:
                        for b in parents:
                            if b.Meta.abstract:
                                for f in b.Meta.local_fields.values():
                                    if f.primary_key:
                                        opts.pk = pk = f
                                        break
                            else:
                                if b.Meta.pk is not None:
                                    pk = OneToOneField(
                                        b, primary_key=True, auto_created=True, parent_link=True, on_delete=CASCADE
                                    )
                                    pk.name = '%s_ptr' % b.Meta.model_name
                                    attr_items = chain(((pk.name, pk),), attr_items)
                                    new_class.Meta.parents[b] = pk
                                    opts.pk = pk
                                    break
                    if pk is None:
                        pk = BigAutoField(primary_key=True)
                        attr_items = chain((('id', pk),), attr_items)
                        opts.pk = pk
            fields = {k: v for k, v in attr_items if isinstance(v, BaseField)}
            opts.local_fields = fields

            if not opts.inherits and not opts.abstract:
                # TODO move to auth application
                if opts.log_changes and False:
                    fields['created_by'] = ForeignKey(
                        'auth.user', verbose_name=_('Created by'),
                        auto_created=True, editable=False, deferred=True, db_index=False, copy=False
                    )
                    fields['created_on'] = DateTimeField(
                        default=datetime.datetime.now, verbose_name=_('Created on'),
                        auto_created=True, editable=False, deferred=True, copy=False
                    )
                    fields['updated_by'] = ForeignKey(
                        'auth.user', verbose_name=_('Updated by'),
                        auto_created=True, editable=False, deferred=True, db_index=False, copy=False
                    )
                    fields['updated_on'] = DateTimeField(
                        on_update=datetime.datetime.now, verbose_name=_('Updated on'),
                        auto_created=True, editable=False, deferred=True, copy=False
                    )

            if not opts.abstract:
                addon.models.append(new_class)

                new_class.add_to_class(
                    'DoesNotExist',
                    subclass_exception(
                        'DoesNotExist',
                        tuple(
                            x.DoesNotExist for x in parents if hasattr(x, '_meta') and not x.Meta.abstract
                        ) or (ObjectDoesNotExist,),
                        module,
                        attached_to=new_class))
                new_class.add_to_class(
                    'MultipleObjectsReturned',
                    subclass_exception(
                        'MultipleObjectsReturned',
                        tuple(
                            x.MultipleObjectsReturned for x in parents if hasattr(x, '_meta') and not x.Meta.abstract
                        ) or (MultipleObjectsReturned,),
                        module,
                        attached_to=new_class))

            return new_class

        new_class = super_new(cls, name, bases, attrs)
        base_model = attrs.get('__model__')
        opts = new_class.Meta(base_model=base_model, apps=app)
        new_class.add_to_class('_meta', opts)

        # TODO optimize the fields copy
        local_fields = {}
        fields = {}
        one_to_one = new_class.Meta.pk.one_to_one
        is_proxy = new_class.Meta.proxy
        if is_proxy:
            new_class._meta.concrete_model = apps[new_class._meta.inherits]
        else:
            new_class._meta.concrete_model = new_class
        for b in reversed(bases):
            if new_class.Meta.inherits and b._meta and b._meta.auto_field:
                new_class._meta.auto_field = b._meta.auto_field
            if ((one_to_one and base_model.Meta.parents) or is_proxy or new_class._meta.override) and b._meta:
                # add all fields to new model

                for f in b._meta.fields:
                    new_class._meta.fields.append(f)

                if is_proxy or new_class._meta.override:
                    new_class._meta.local_fields.extend(b._meta.local_fields)
                if new_class._meta.override:
                    for f in new_class._meta.local_fields:
                        fields[f.name] = f
                        f.model = new_class

            elif b._meta:
                if b._meta.parents:
                    new_class._meta.parents.update(b._meta.parents)
                else:
                    new_class._meta.auto_field = b._meta.auto_field
                for f in b._meta.fields:
                    fields[f.name] = f
                    new_class._meta.fields.append(f)
                for f in b._meta.local_fields:
                    f.model = new_class
                    new_class._meta.local_fields.append(f)
            else:
                # Add remaining attributes (those with a contribute_to_class() method)
                # to the class.
                for k, v in b.Meta.local_fields.items():
                    f = fields.get(k)
                    if b.Meta.abstract:
                        if f is None:
                            field = v.clone()
                        elif f in new_class._meta.local_fields:
                            field = v.assign(f)
                        else:
                            field = v.clone(f)
                    elif f:
                        field = v.assign(f)
                    else:
                        field = v

                    if k in fields:
                        new_class._meta.local_fields.remove(fields[k])
                    else:
                        new_class.add_to_class(k, field)
                    new_class._meta.local_fields.append(field)
                    fields[k] = field

                for obj_name, obj in b.Meta.contributable_attrs.items():
                    if not isinstance(obj, Field):
                        new_class.add_to_class(obj_name, obj)

                for parent, field in b.Meta.parents.items():
                    if parent.Meta.proxy:
                        m = app.models[parent.Meta.inherits.Meta.name]
                    else:
                        m = app.models[parent.Meta.name]
                    new_class._meta.parents[m] = fields.get(field.name, field)

        for f in new_class._meta.local_fields:
            if f.primary_key:
                new_class._meta.pk = f

        app.register_model(new_class)
        new_class._prepare()
        return new_class

    def __build__(cls, app):
        bases = [cls] + [
            app.models.get(base.Meta.name, base)
            for base in cls.Meta.bases
            if issubclass(base, Model) and base.Meta and base is not cls
        ]
        new_cls = type(cls.__name__, tuple(bases), {'__module__': cls.__module__, '__app__': app, '__model__': cls})
        if app.models_ready:
            app.do_pending_operations()
        return new_cls

    def add_to_class(cls, name, value):
        if _has_contribute_to_class(value):
            value.contribute_to_class(cls, name)
        else:
            setattr(cls, name, value)

    def _prepare(cls):
        """Create some methods once self._meta has been populated."""
        opts = cls._meta
        opts._prepare(cls)

        if opts.order_with_respect_to:
            cls.get_next_in_order = partialmethod(cls._get_next_or_previous_in_order, is_next=True)
            cls.get_previous_in_order = partialmethod(cls._get_next_or_previous_in_order, is_next=False)

            # Defer creating accessors on the foreign class until it has been
            # created and registered. If remote_field is None, we're ordering
            # with respect to a GenericForeignKey and don't know what the
            # foreign class is - we'll add those accessors later in
            # contribute_to_class().
            if opts.order_with_respect_to.remote_field:
                wrt = opts.order_with_respect_to
                remote = wrt.remote_field.model
                lazy_related_operation(make_foreign_order_accessors, cls, remote)

        # Give the class a docstring -- its definition.
        if cls.__doc__ is None:
            cls.__doc__ = "%s(%s)" % (cls.__name__, ", ".join(f.name for f in opts.fields))

        get_absolute_url_override = settings.ABSOLUTE_URL_OVERRIDES.get(opts.name)
        if get_absolute_url_override:
            setattr(cls, 'get_absolute_url', get_absolute_url_override)

        if not opts.managers:
            if 'objects' in opts.fields:
                raise ValueError(
                    "Model %s must specify a custom Manager, because it has a "
                    "field named 'objects'." % opts.name
                )
            manager = Manager()
            manager.auto_created = True
            cls.add_to_class('objects', manager)

        # Set the name of _meta.indexes. This can't be done in
        # Options.contribute_to_class() because fields haven't been added to
        # the model at that point.
        for index in cls._meta.indexes:
            if not index.name:
                index.set_name_with_model(cls)

        class_prepared.send(sender=cls)

    @property
    def _base_manager(cls):
        return cls._meta.base_manager

    @property
    def _default_manager(cls):
        return cls._meta.default_manager


class ModelStateFieldsCacheDescriptor:
    def __get__(self, instance, cls=None):
        if instance is None:
            return self
        res = instance.fields_cache = {}
        return res


class ModelState:
    """Store model instance state."""
    db = None
    # If true, uniqueness validation checks will consider this a new, unsaved
    # object. Necessary for correct validation of new instances of objects with
    # explicit (non-auto) PKs. This impacts validation only; it has no effect
    # on the actual save.
    adding = True
    fields_cache = ModelStateFieldsCacheDescriptor()


class Model(metaclass=ModelBase):
    objects: Manager
    env = apps.env
    _meta: Options

    def __init__(self, *args, **kwargs):
        # Alias some things as locals to avoid repeat global lookups
        cls = self.__class__
        opts = self._meta
        _setattr = setattr
        _DEFERRED = DEFERRED

        pre_init.send(sender=cls, args=args, kwargs=kwargs)

        # Set up the storage for instance state
        self._state = ModelState()

        # There is a rather weird disparity here; if kwargs, it's set, then args
        # overrides it. It should be one or the other; don't duplicate the work
        # The reason for the kwargs check is that standard iterator passes in by
        # args, and instantiation for iteration is 33% faster.
        if len(args) > len(opts.fields):
            # Daft, but matches old exception sans the err msg.
            raise IndexError("Number of args exceeds number of fields")

        if not kwargs:
            fields_iter = iter(opts.concrete_fields)
            # The ordering of the zip calls matter - zip throws StopIteration
            # when an iter throws it. So if the first iter throws it, the second
            # is *not* consumed. We rely on this, so don't change the order
            # without changing the logic.
            for val, field in zip(args, fields_iter):
                if val is _DEFERRED:
                    continue
                _setattr(self, field.attname, val)
        else:
            # Slower, kwargs-ready version.
            fields_iter = iter(opts.concrete_fields)
            for val, field in zip(args, fields_iter):
                if val is _DEFERRED:
                    continue
                _setattr(self, field.attname, val)
                kwargs.pop(field.name, None)

        # Now we're left with the unprocessed fields that *must* come from
        # keywords, or default.

        for field in fields_iter:
            is_related_object = False
            # Virtual field
            if field.attname not in kwargs and field.column is None:
                continue
            if kwargs:
                if isinstance(field.remote_field, ForeignObjectRel):
                    try:
                        # Assume object instance was passed in.
                        rel_obj = kwargs.pop(field.name)
                        is_related_object = True
                    except KeyError:
                        try:
                            # Object instance wasn't passed in -- must be an ID.
                            val = kwargs.pop(field.attname)
                        except KeyError:
                            val = field.get_default()
                    else:
                        # Object instance was passed in. Special case: You can
                        # pass in "None" for related objects if it's allowed.
                        if rel_obj is None and field.null:
                            val = None
                else:
                    try:
                        val = kwargs.pop(field.attname)
                    except KeyError:
                        # This is done with an exception rather than the
                        # default argument on pop because we don't want
                        # get_default() to be evaluated, and then not used.
                        # Refs #12057.
                        val = field.get_default()
            else:
                val = field.get_default()

            if is_related_object:
                # If we are passed a related instance, set it using the
                # field.name instead of field.attname (e.g. "user" instead of
                # "user_id") so that the object gets properly cached (and type
                # checked) by the RelatedObjectDescriptor.
                if rel_obj is not _DEFERRED:
                    _setattr(self, field.name, rel_obj)
            else:
                if val is not _DEFERRED:
                    _setattr(self, field.attname, val)

        if kwargs:
            property_names = opts._property_names
            for prop in tuple(kwargs):
                try:
                    # Any remaining kwargs must correspond to properties or
                    # virtual fields.
                    if prop in property_names or opts.get_field(prop):
                        if kwargs[prop] is not _DEFERRED:
                            _setattr(self, prop, kwargs[prop])
                        del kwargs[prop]
                except (AttributeError, FieldDoesNotExist):
                    pass
            for kwarg in kwargs:
                raise TypeError("%s() got an unexpected keyword argument '%s'" % (cls.__name__, kwarg))
        super().__init__()
        post_init.send(sender=cls, instance=self)

    @classmethod
    def from_db(cls, db, field_names, values):
        if len(values) != len(cls._meta.concrete_fields):
            values_iter = iter(values)
            values = [
                next(values_iter) if f.attname in field_names else DEFERRED
                for f in cls._meta.concrete_fields
            ]
        new = cls(*values)
        new._state.adding = False
        new._state.db = db
        return new

    def __repr__(self):
        return '<%s: %s>' % (self.__class__.__name__, self)

    def __str__(self):
        if self._meta.title_field:
            f = self._meta.fields[self._meta.title_field]
            v = f.to_json(getattr(self, self._meta.title_field))
            if not isinstance(v, str):
                v = str(v)
            return v
        return '%s object (%s)' % (self._meta.name, self.pk)

    def __eq__(self, other):
        if not isinstance(other, Model):
            return False
        if self._meta.model != other._meta.model:
            return False
        my_pk = self.pk
        if my_pk is None:
            return self is other
        return my_pk == other.pk

    def __hash__(self):
        if self.pk is None:
            raise TypeError("Model instances without primary key value are unhashable")
        return hash(self.pk)

    def __reduce__(self):
        data = self.__getstate__()
        data[ORUN_VERSION_PICKLE_KEY] = get_version()
        class_id = self._meta.name
        return model_unpickle, (class_id,), data

    def __getstate__(self):
        """Hook to allow choosing the attributes to pickle."""
        return self.__dict__

    def __setstate__(self, state):
        msg = None
        pickled_version = state.get(ORUN_VERSION_PICKLE_KEY)
        if pickled_version:
            current_version = get_version()
            if current_version != pickled_version:
                msg = (
                    "Pickled model instance's Orun version %s does not match "
                    "the current version %s." % (pickled_version, current_version)
                )
        else:
            msg = "Pickled model instance's Orun version is not specified."

        if msg:
            warnings.warn(msg, RuntimeWarning, stacklevel=2)

        self.__dict__.update(state)

    def _get_pk_val(self, meta=None):
        meta = meta or self._meta
        return getattr(self, meta.pk.attname)

    def _set_pk_val(self, value):
        return setattr(self, self._meta.pk.attname, value)

    pk = property(_get_pk_val, _set_pk_val)

    def get_deferred_fields(self):
        """
        Return a set containing names of deferred fields for this instance.
        """
        return {
            f.attname for f in self._meta.concrete_fields
            if f.attname not in self.__dict__
        }

    def refresh_from_db(self, using=None, fields=None):
        """
        Reload field values from the database.

        By default, the reloading happens from the database this instance was
        loaded from, or by the read router if this instance wasn't loaded from
        any database. The using parameter will override the default.

        Fields can be used to specify which fields to reload. The fields
        should be an iterable of field attnames. If fields is None, then
        all non-deferred fields are reloaded.

        When accessing deferred fields of an instance, the deferred loading
        of the field will call this method.
        """
        if fields is None:
            self._prefetched_objects_cache = {}
        else:
            prefetched_objects_cache = getattr(self, '_prefetched_objects_cache', ())
            for field in fields:
                if field in prefetched_objects_cache:
                    del prefetched_objects_cache[field]
                    fields.remove(field)
            if not fields:
                return
            if any(LOOKUP_SEP in f for f in fields):
                raise ValueError(
                    'Found "%s" in fields argument. Relations and transforms '
                    'are not allowed in fields.' % LOOKUP_SEP)

        hints = {'instance': self}
        db_instance_qs = self.__class__._base_manager.db_manager(using, hints=hints).filter(pk=self.pk)

        # Use provided fields, if not set then reload all non-deferred fields.
        deferred_fields = self.get_deferred_fields()
        if fields is not None:
            fields = list(fields)
            db_instance_qs = db_instance_qs.only(*fields)
        elif deferred_fields:
            fields = [f.attname for f in self._meta.concrete_fields
                      if f.attname not in deferred_fields]
            db_instance_qs = db_instance_qs.only(*fields)

        db_instance = db_instance_qs.get()
        non_loaded_fields = db_instance.get_deferred_fields()
        for field in self._meta.concrete_fields:
            if field.attname in non_loaded_fields:
                # This field wasn't refreshed - skip ahead.
                continue
            setattr(self, field.attname, getattr(db_instance, field.attname))
            # Clear cached foreign keys.
            if field.is_relation and field.is_cached(self):
                field.delete_cached_value(self)

        # Clear cached relations.
        for field in self._meta.related_objects:
            if field.is_cached(self):
                field.delete_cached_value(self)

        self._state.db = db_instance._state.db

    def serializable_value(self, field_name):
        """
        Return the value of the field name for this instance. If the field is
        a foreign key, return the id value instead of the object. If there's
        no Field object with this name on the model, return the model
        attribute's value.

        Used to serialize a field's value (in the serializer, or form output,
        for example). Normally, you would just access the attribute directly
        and not use this method.
        """
        try:
            field = self._meta.get_field(field_name)
        except FieldDoesNotExist:
            return getattr(self, field_name)
        return getattr(self, field.attname)

    def save(self, force_insert=False, force_update=False, using=None,
             update_fields=None):
        """
        Save the current instance. Override this in a subclass if you want to
        control the saving process.

        The 'force_insert' and 'force_update' parameters can be used to insist
        that the "save" must be an SQL insert or update (or equivalent for
        non-SQL backends), respectively. Normally, they should not be set.
        """
        # Ensure that a model instance without a PK hasn't been assigned to
        # a ForeignKey or OneToOneField on this model. If the field is
        # nullable, allowing the save() would result in silent data loss.
        for field in self._meta.concrete_fields:
            # If the related field isn't cached, then an instance hasn't
            # been assigned and there's no need to worry about this check.
            if field.is_relation and field.is_cached(self):
                obj = getattr(self, field.name, None)
                # A pk may have been assigned manually to a model instance not
                # saved to the database (or auto-generated in a case like
                # UUIDField), but we allow the save to proceed and rely on the
                # database to raise an IntegrityError if applicable. If
                # constraints aren't supported by the database, there's the
                # unavoidable risk of data corruption.
                if obj and obj.pk is None:
                    # Remove the object from a related instance cache.
                    if not field.remote_field.multiple:
                        field.remote_field.delete_cached_value(obj)
                    raise ValueError(
                        "save() prohibited to prevent data loss due to "
                        "unsaved related object '%s'." % field.name
                    )
                # If the relationship's pk/to_field was changed, clear the
                # cached relationship.
                if obj and getattr(obj, field.target_field.attname) != getattr(self, field.attname):
                    field.delete_cached_value(self)

        using = using or router.db_for_write(self.__class__, instance=self)
        if force_insert and (force_update or update_fields):
            raise ValueError("Cannot force both insert and updating in model saving.")

        deferred_fields = self.get_deferred_fields()
        if update_fields is not None:
            # If update_fields is empty, skip the save. We do also check for
            # no-op saves later on for inheritance cases. This bailout is
            # still needed for skipping signal sending.
            if not update_fields:
                return

            update_fields = frozenset(update_fields)
            field_names = set()

            for field in self._meta.fields:
                if not field.primary_key:
                    field_names.add(field.name)

                    if field.name != field.attname:
                        field_names.add(field.attname)

            non_model_fields = update_fields.difference(field_names)

            if non_model_fields:
                raise ValueError("The following fields do not exist in this "
                                 "model or are m2m fields: %s"
                                 % ', '.join(non_model_fields))

        # If saving to the same database, and this model is deferred, then
        # automatically do a "update_fields" save on the loaded fields.
        elif not force_insert and deferred_fields and using == self._state.db:
            field_names = set()
            for field in self._meta.concrete_fields:
                if not field.primary_key and not hasattr(field, 'through'):
                    field_names.add(field.attname)
            loaded_fields = field_names.difference(deferred_fields)
            if loaded_fields:
                update_fields = frozenset(loaded_fields)

        self.save_base(using=using, force_insert=force_insert,
                       force_update=force_update, update_fields=update_fields)
    save.alters_data = True

    def save_base(self, raw=False, force_insert=False,
                  force_update=False, using=None, update_fields=None):
        """
        Handle the parts of saving which should be done only once per save,
        yet need to be done in raw saves, too. This includes some sanity
        checks and signal sending.

        The 'raw' argument is telling save_base not to save any parent
        models and not to do any changes to the values before save. This
        is used by fixture loading.
        """
        using = using or router.db_for_write(self.__class__, instance=self)
        assert not (force_insert and (force_update or update_fields))
        assert update_fields is None or update_fields
        cls = origin = self.__class__
        meta = cls._meta
        if not meta.auto_created:
            pre_save.send(
                sender=origin, instance=self, raw=raw, using=using,
                update_fields=update_fields,
            )
        # A transaction isn't needed if one query is issued.
        if meta.parents:
            context_manager = transaction.atomic(using=using, savepoint=False)
        else:
            context_manager = transaction.mark_for_rollback_on_error(using=using)
        with context_manager:
            parent_inserted = False
            if not raw:
                parent_inserted = self._save_parents(cls, using, update_fields)
            updated = self._save_table(
                raw, cls, force_insert or parent_inserted,
                force_update, using, update_fields,
            )
        # Store the database on which the object was saved
        self._state.db = using
        # Once saved, this is no longer a to-be-added instance.
        self._state.adding = False

        # Signal that the save is complete
        if not meta.auto_created:
            post_save.send(
                sender=origin, instance=self, created=(not updated),
                update_fields=update_fields, raw=raw, using=using,
            )

    save_base.alters_data = True

    def _save_parents(self, cls, using, update_fields):
        """Save all the parents of cls using values from self."""
        meta = cls._meta
        inserted = False
        for parent, field in meta.parents.items():
            # Make sure the link fields are synced between parent and self.
            if (field and getattr(self, parent._meta.pk.attname) is None and
                    getattr(self, field.attname) is not None):
                setattr(self, parent._meta.pk.attname, getattr(self, field.attname))
            parent_inserted = self._save_parents(cls=parent, using=using, update_fields=update_fields)
            updated = self._save_table(
                cls=parent, using=using, update_fields=update_fields,
                force_insert=parent_inserted,
            )
            if not updated:
                inserted = True
            # Set the parent's PK value to self.
            if field:
                setattr(self, field.attname, self._get_pk_val(parent._meta))
                # Since we didn't have an instance of the parent handy set
                # attname directly, bypassing the descriptor. Invalidate
                # the related object cache, in case it's been accidentally
                # populated. A fresh instance will be re-built from the
                # database if necessary.
                if field.is_cached(self):
                    field.delete_cached_value(self)
        return inserted

    def _save_table(self, raw=False, cls=None, force_insert=False,
                    force_update=False, using=None, update_fields=None):
        """
        Do the heavy-lifting involved in saving. Update or insert the data
        for a single table.
        """
        meta = cls._meta
        non_pks = [f for f in meta.local_concrete_fields if not f.primary_key]

        if update_fields:
            non_pks = [f for f in non_pks
                       if f.name in update_fields or f.attname in update_fields]

        pk_val = self._get_pk_val(meta)
        if pk_val is None:
            pk_val = meta.pk.get_pk_value_on_save(self)
            setattr(self, meta.pk.attname, pk_val)
        pk_set = pk_val is not None
        if not pk_set and (force_update or update_fields):
            raise ValueError("Cannot force an update in save() with no primary key.")
        updated = False
        # If possible, try an UPDATE. If that doesn't update anything, do an INSERT.
        if pk_set and not force_insert:
            base_qs = cls._base_manager.using(using)
            values = [(f, None, (getattr(self, f.attname) if raw else f.pre_save(self, False)))
                      for f in non_pks]
            forced_update = update_fields or force_update
            updated = self._do_update(base_qs, using, pk_val, values, update_fields,
                                      forced_update)
            if force_update and not updated:
                raise DatabaseError("Forced update did not affect any rows.")
            if update_fields and not updated:
                raise DatabaseError("Save with update_fields did not affect any rows.")
        if not updated:
            if meta.order_with_respect_to:
                # If this is a model with an order_with_respect_to
                # autopopulate the _order field
                field = meta.order_with_respect_to
                filter_args = field.get_filter_kwargs_for_object(self)
                order_value = cls._base_manager.using(using).filter(**filter_args).count()
                self._order = order_value

            fields = meta.local_concrete_fields
            if not pk_set:
                fields = [f for f in fields if f is not meta.auto_field]

            update_pk = meta.auto_field and not pk_set
            result = self._do_insert(cls._base_manager, using, fields, update_pk, raw)
            if update_pk:
                setattr(self, meta.pk.attname, result)
        return updated

    def _do_update(self, base_qs, using, pk_val, values, update_fields, forced_update):
        """
        Try to update the model. Return True if the model was updated (if an
        update query was done and a matching row was found in the DB).
        """
        filtered = base_qs.filter(pk=pk_val)
        if not values:
            # We can end up here when saving a model in inheritance chain where
            # update_fields doesn't target any field in current model. In that
            # case we just say the update succeeded. Another case ending up here
            # is a model with just PK - in that case check that the PK still
            # exists.
            return update_fields is not None or filtered.exists()
        if self._meta.select_on_save and not forced_update:
            return (
                filtered.exists() and
                # It may happen that the object is deleted from the DB right after
                # this check, causing the subsequent UPDATE to return zero matching
                # rows. The same result can occur in some rare cases when the
                # database returns zero despite the UPDATE being executed
                # successfully (a row is matched and updated). In order to
                # distinguish these two cases, the object's existence in the
                # database is again checked for if the UPDATE query returns 0.
                (filtered._update(values) > 0 or filtered.exists())
            )
        return filtered._update(values) > 0

    def _do_insert(self, manager, using, fields, update_pk, raw):
        """
        Do an INSERT. If update_pk is defined then this method should return
        the new pk for the model.
        """
        return manager._insert([self], fields=fields, return_id=update_pk,
                               using=using, raw=raw)

    def delete(self, using=None, keep_parents=False):
        using = using or router.db_for_write(self.__class__, instance=self)
        assert self.pk is not None, (
            "%s object can't be deleted because its %s attribute is set to None." %
            (self._meta.object_name, self._meta.pk.attname)
        )

        collector = Collector(using=using)
        collector.collect([self], keep_parents=keep_parents)
        return collector.delete()

    delete.alters_data = True

    def _get_FIELD_display(self, field):
        value = getattr(self, field.attname)
        # force_str() to coerce lazy strings.
        return force_str(dict(field.flatchoices).get(value, value), strings_only=True)

    def _get_next_or_previous_by_FIELD(self, field, is_next, **kwargs):
        if not self.pk:
            raise ValueError("get_next/get_previous cannot be used on unsaved objects.")
        op = 'gt' if is_next else 'lt'
        order = '' if is_next else '-'
        param = getattr(self, field.attname)
        q = Q(**{'%s__%s' % (field.name, op): param})
        q = q | Q(**{field.name: param, 'pk__%s' % op: self.pk})
        qs = self.__class__._default_manager.using(self._state.db).filter(**kwargs).filter(q).order_by(
            '%s%s' % (order, field.name), '%spk' % order
        )
        try:
            return qs[0]
        except IndexError:
            raise self.DoesNotExist("%s matching query does not exist." % self.__class__._meta.object_name)

    def _get_next_or_previous_in_order(self, is_next):
        cachename = "__%s_order_cache" % is_next
        if not hasattr(self, cachename):
            op = 'gt' if is_next else 'lt'
            order = '_order' if is_next else '-_order'
            order_field = self._meta.order_with_respect_to
            filter_args = order_field.get_filter_kwargs_for_object(self)
            obj = self.__class__._default_manager.filter(**filter_args).filter(**{
                '_order__%s' % op: self.__class__._default_manager.values('_order').filter(**{
                    self._meta.pk.name: self.pk
                })
            }).order_by(order)[:1].get()
            setattr(self, cachename, obj)
        return getattr(self, cachename)

    def prepare_database_save(self, field):
        if self.pk is None:
            raise ValueError("Unsaved model instance %r cannot be used in an ORM query." % self)
        return getattr(self, field.remote_field.get_related_field().attname)

    def clean(self):
        """
        Hook for doing any extra model-wide validation after clean() has been
        called on every field by self.clean_fields. Any ValidationError raised
        by this method will not be associated with a particular field; it will
        have a special-case association with the field defined by NON_FIELD_ERRORS.
        """
        pass

    def validate_unique(self, exclude=None):
        """
        Check unique constraints on the model and raise ValidationError if any
        failed.
        """
        unique_checks, date_checks = self._get_unique_checks(exclude=exclude)

        errors = self._perform_unique_checks(unique_checks)
        date_errors = self._perform_date_checks(date_checks)

        for k, v in date_errors.items():
            errors.setdefault(k, []).extend(v)

        if errors:
            raise ValidationError(errors)

    def _get_unique_checks(self, exclude=None):
        """
        Return a list of checks to perform. Since validate_unique() could be
        called from a ModelForm, some fields may have been excluded; we can't
        perform a unique check on a model that is missing fields involved
        in that check. Fields that did not validate should also be excluded,
        but they need to be passed in via the exclude argument.
        """
        if exclude is None:
            exclude = []
        unique_checks = []

        unique_togethers = [(self.__class__, self._meta.unique_together)]
        constraints = [(self.__class__, self._meta.constraints)]
        for parent_class in self._meta.get_parent_list():
            if parent_class._meta.unique_together:
                unique_togethers.append((parent_class, parent_class._meta.unique_together))
            if parent_class._meta.constraints:
                constraints.append((parent_class, parent_class._meta.constraints))

        for model_class, unique_together in unique_togethers:
            for check in unique_together:
                if not any(name in exclude for name in check):
                    # Add the check if the field isn't excluded.
                    unique_checks.append((model_class, tuple(check)))

        for model_class, model_constraints in constraints:
            for constraint in model_constraints:
                if (isinstance(constraint, UniqueConstraint) and
                        # Partial unique constraints can't be validated.
                        constraint.condition is None and
                        not any(name in exclude for name in constraint.fields)):
                    unique_checks.append((model_class, constraint.fields))

        # These are checks for the unique_for_<date/year/month>.
        date_checks = []

        # Gather a list of checks for fields declared as unique and add them to
        # the list of checks.

        fields_with_class = [(self.__class__, self._meta.local_fields)]
        for parent_class in self._meta.get_parent_list():
            fields_with_class.append((parent_class, parent_class._meta.local_fields))

        for model_class, fields in fields_with_class:
            for f in fields:
                name = f.name
                if name in exclude:
                    continue
                if f.unique:
                    unique_checks.append((model_class, (name,)))
                if f.unique_for_date and f.unique_for_date not in exclude:
                    date_checks.append((model_class, 'date', name, f.unique_for_date))
                if f.unique_for_year and f.unique_for_year not in exclude:
                    date_checks.append((model_class, 'year', name, f.unique_for_year))
                if f.unique_for_month and f.unique_for_month not in exclude:
                    date_checks.append((model_class, 'month', name, f.unique_for_month))
        return unique_checks, date_checks

    def _perform_unique_checks(self, unique_checks):
        errors = {}

        for model_class, unique_check in unique_checks:
            # Try to look up an existing object with the same values as this
            # object's values for all the unique field.

            lookup_kwargs = {}
            for field_name in unique_check:
                f = self._meta.get_field(field_name)
                lookup_value = getattr(self, f.attname)
                # TODO: Handle multiple backends with different feature flags.
                if (lookup_value is None or
                        (lookup_value == '' and connection.features.interprets_empty_strings_as_nulls)):
                    # no value, skip the lookup
                    continue
                if f.primary_key and not self._state.adding:
                    # no need to check for unique primary key when editing
                    continue
                lookup_kwargs[str(field_name)] = lookup_value

            # some fields were skipped, no reason to do the check
            if len(unique_check) != len(lookup_kwargs):
                continue

            qs = model_class._default_manager.filter(**lookup_kwargs)

            # Exclude the current object from the query if we are editing an
            # instance (as opposed to creating a new one)
            # Note that we need to use the pk as defined by model_class, not
            # self.pk. These can be different fields because model inheritance
            # allows single model to have effectively multiple primary keys.
            # Refs #17615.
            model_class_pk = self._get_pk_val(model_class._meta)
            if not self._state.adding and model_class_pk is not None:
                qs = qs.exclude(pk=model_class_pk)
            if qs.exists():
                if len(unique_check) == 1:
                    key = unique_check[0]
                else:
                    key = NON_FIELD_ERRORS
                errors.setdefault(key, []).append(self.unique_error_message(model_class, unique_check))

        return errors

    def _perform_date_checks(self, date_checks):
        errors = {}
        for model_class, lookup_type, field, unique_for in date_checks:
            lookup_kwargs = {}
            # there's a ticket to add a date lookup, we can remove this special
            # case if that makes it's way in
            date = getattr(self, unique_for)
            if date is None:
                continue
            if lookup_type == 'date':
                lookup_kwargs['%s__day' % unique_for] = date.day
                lookup_kwargs['%s__month' % unique_for] = date.month
                lookup_kwargs['%s__year' % unique_for] = date.year
            else:
                lookup_kwargs['%s__%s' % (unique_for, lookup_type)] = getattr(date, lookup_type)
            lookup_kwargs[field] = getattr(self, field)

            qs = model_class._default_manager.filter(**lookup_kwargs)
            # Exclude the current object from the query if we are editing an
            # instance (as opposed to creating a new one)
            if not self._state.adding and self.pk is not None:
                qs = qs.exclude(pk=self.pk)

            if qs.exists():
                errors.setdefault(field, []).append(
                    self.date_error_message(lookup_type, field, unique_for)
                )
        return errors

    def date_error_message(self, lookup_type, field_name, unique_for):
        opts = self._meta
        field = opts.get_field(field_name)
        return ValidationError(
            message=field.error_messages['unique_for_date'],
            code='unique_for_date',
            params={
                'model': self,
                'model_name': capfirst(opts.verbose_name),
                'lookup_type': lookup_type,
                'field': field_name,
                'field_label': capfirst(field.verbose_name),
                'date_field': unique_for,
                'date_field_label': capfirst(opts.get_field(unique_for).verbose_name),
            }
        )

    def unique_error_message(self, model_class, unique_check):
        opts = model_class._meta

        params = {
            'model': self,
            'model_class': model_class,
            'model_name': capfirst(opts.verbose_name),
            'unique_check': unique_check,
        }

        # A unique field
        if len(unique_check) == 1:
            field = opts.get_field(unique_check[0])
            params['field_label'] = capfirst(field.verbose_name)
            return ValidationError(
                message=field.error_messages['unique'],
                code='unique',
                params=params,
            )

        # unique_together
        else:
            field_labels = [capfirst(opts.get_field(f).verbose_name) for f in unique_check]
            params['field_labels'] = get_text_list(field_labels, _('and'))
            return ValidationError(
                message=_("%(model_name)s with this %(field_labels)s already exists."),
                code='unique_together',
                params=params,
            )

    def full_clean(self, exclude=None, validate_unique=True):
        """
        Call clean_fields(), clean(), and validate_unique() on the model.
        Raise a ValidationError for any errors that occur.
        """
        errors = {}
        if exclude is None:
            exclude = []
        else:
            exclude = list(exclude)

        try:
            self.clean_fields(exclude=exclude)
        except ValidationError as e:
            errors = e.update_error_dict(errors)

        # Form.clean() is run even if other validation fails, so do the
        # same with Model.clean() for consistency.
        try:
            self.clean()
        except ValidationError as e:
            errors = e.update_error_dict(errors)

        # Run unique checks, but only for fields that passed validation.
        if validate_unique:
            for name in errors:
                if name != NON_FIELD_ERRORS and name not in exclude:
                    exclude.append(name)
            try:
                self.validate_unique(exclude=exclude)
            except ValidationError as e:
                errors = e.update_error_dict(errors)

        if errors:
            raise ValidationError(errors)

    def clean_fields(self, exclude=None):
        """
        Clean all fields and raise a ValidationError containing a dict
        of all validation errors if any occur.
        """
        if exclude is None:
            exclude = []

        errors = {}
        for f in self._meta.concrete_fields:
            if f.name in exclude:
                continue
            # Skip validation for empty fields with blank=True. The developer
            # is responsible for making sure they have a valid value.
            raw_value = getattr(self, f.attname)
            if not f.required and raw_value in f.empty_values:
                continue
            try:
                setattr(self, f.attname, f.clean(raw_value, self))
            except ValidationError as e:
                errors[f.name] = e.error_list

        if errors:
            raise ValidationError(errors)

    @classmethod
    def check(cls, **kwargs):
        errors = [*cls._check_model(), *cls._check_managers(**kwargs)]
        if not cls._meta.swapped:
            errors += [
                *cls._check_fields(**kwargs),
                *cls._check_m2m_through_same_relationship(),
                *cls._check_long_column_names(),
            ]
            clash_errors = (
                *cls._check_id_field(),
                *cls._check_field_name_clashes(),
                *cls._check_model_name_db_lookup_clashes(),
                *cls._check_property_name_related_field_accessor_clashes(),
                *cls._check_single_primary_key(),
            )
            errors.extend(clash_errors)
            # If there are field name clashes, hide consequent column name
            # clashes.
            if not clash_errors:
                errors.extend(cls._check_column_name_clashes())
            errors += [
                *cls._check_index_together(),
                *cls._check_unique_together(),
                *cls._check_indexes(),
                *cls._check_ordering(),
                *cls._check_constraints(),
            ]

        return errors

    @classmethod
    def _check_model(cls):
        errors = []
        if cls._meta.proxy:
            if cls._meta.local_fields or cls._meta.local_many_to_many:
                errors.append(
                    checks.Error(
                        "Proxy model '%s' contains model fields." % cls.__name__,
                        id='models.E017',
                    )
                )
        return errors

    @classmethod
    def _check_managers(cls, **kwargs):
        """Perform all manager checks."""
        errors = []
        for manager in cls._meta.managers:
            errors.extend(manager.check(**kwargs))
        return errors

    @classmethod
    def _check_fields(cls, **kwargs):
        """Perform all field checks."""
        errors = []
        return errors
        for field in cls._meta.local_fields:
            errors.extend(field.check(**kwargs))
        for field in cls._meta.local_many_to_many:
            errors.extend(field.check(from_model=cls, **kwargs))
        return errors

    @classmethod
    def _check_m2m_through_same_relationship(cls):
        """ Check if no relationship model is used by more than one m2m field.
        """

        errors = []
        return errors
        seen_intermediary_signatures = []

        fields = cls._meta.local_many_to_many

        # Skip when the target model wasn't found.
        fields = (f for f in fields if isinstance(f.remote_field.model, ModelBase))

        # Skip when the relationship model wasn't found.
        fields = (f for f in fields if isinstance(f.remote_field.through, ModelBase))

        for f in fields:
            signature = (f.remote_field.model, cls, f.remote_field.through, f.remote_field.through_fields)
            if signature in seen_intermediary_signatures:
                errors.append(
                    checks.Error(
                        "The model has two identical many-to-many relations "
                        "through the intermediate model '%s'." %
                        f.remote_field.through._meta.label,
                        obj=cls,
                        id='models.E003',
                    )
                )
            else:
                seen_intermediary_signatures.append(signature)
        return errors

    @classmethod
    def _check_id_field(cls):
        """Check if `id` field is a primary key."""
        fields = [f for f in cls._meta.local_fields if f.name == 'id' and f != cls._meta.pk]
        # fields is empty or consists of the invalid "id" field
        if fields and not fields[0].primary_key and cls._meta.pk.name == 'id':
            return [
                checks.Error(
                    "'id' can only be used as a field name if the field also "
                    "sets 'primary_key=True'.",
                    obj=cls,
                    id='models.E004',
                )
            ]
        else:
            return []

    @classmethod
    def _check_field_name_clashes(cls):
        """Forbid field shadowing in multi-table inheritance."""
        errors = []
        return errors
        used_fields = {}  # name or attname -> field

        # Check that multi-inheritance doesn't cause field name shadowing.
        for parent in cls._meta.get_parent_list():
            for f in parent._meta.local_fields:
                clash = used_fields.get(f.name) or used_fields.get(f.attname) or None
                if clash:
                    errors.append(
                        checks.Error(
                            "The field '%s' from parent model "
                            "'%s' clashes with the field '%s' "
                            "from parent model '%s'." % (
                                clash.name, clash.model._meta,
                                f.name, f.model._meta
                            ),
                            obj=cls,
                            id='models.E005',
                        )
                    )
                used_fields[f.name] = f
                used_fields[f.attname] = f

        # Check that fields defined in the model don't clash with fields from
        # parents, including auto-generated fields like multi-table inheritance
        # child accessors.
        for parent in cls._meta.get_parent_list():
            for f in parent._meta.get_fields():
                if f not in used_fields:
                    used_fields[f.name] = f

        for f in cls._meta.local_fields:
            clash = used_fields.get(f.name) or used_fields.get(f.attname) or None
            # Note that we may detect clash between user-defined non-unique
            # field "id" and automatically added unique field "id", both
            # defined at the same model. This special case is considered in
            # _check_id_field and here we ignore it.
            id_conflict = f.name == "id" and clash and clash.name == "id" and clash.model == cls
            if clash and not id_conflict:
                errors.append(
                    checks.Error(
                        "The field '%s' clashes with the field '%s' "
                        "from model '%s'." % (
                            f.name, clash.name, clash.model._meta
                        ),
                        obj=f,
                        id='models.E006',
                    )
                )
            used_fields[f.name] = f
            used_fields[f.attname] = f

        return errors

    @classmethod
    def _check_column_name_clashes(cls):
        # Store a list of column names which have already been used by other fields.
        used_column_names = []
        errors = []

        for f in cls._meta.local_fields:
            _, column_name = f.get_attname_column()

            # Ensure the column name is not already in use.
            if column_name and column_name in used_column_names:
                errors.append(
                    checks.Error(
                        "Field '%s' has column name '%s' that is used by "
                        "another field." % (f.name, column_name),
                        hint="Specify a 'db_column' for the field.",
                        obj=cls,
                        id='models.E007'
                    )
                )
            else:
                used_column_names.append(column_name)

        return errors

    @classmethod
    def _check_model_name_db_lookup_clashes(cls):
        errors = []
        model_name = cls.__name__
        if model_name.startswith('_') or model_name.endswith('_'):
            errors.append(
                checks.Error(
                    "The model name '%s' cannot start or end with an underscore "
                    "as it collides with the query lookup syntax." % model_name,
                    obj=cls,
                    id='models.E023'
                )
            )
        elif LOOKUP_SEP in model_name:
            errors.append(
                checks.Error(
                    "The model name '%s' cannot contain double underscores as "
                    "it collides with the query lookup syntax." % model_name,
                    obj=cls,
                    id='models.E024'
                )
            )
        return errors

    @classmethod
    def _check_property_name_related_field_accessor_clashes(cls):
        errors = []
        property_names = cls._meta._property_names
        related_field_accessors = (
            f.get_attname() for f in cls._meta._get_fields(reverse=False)
            if f.is_relation and f.related_model is not None
        )
        for accessor in related_field_accessors:
            if accessor in property_names:
                errors.append(
                    checks.Error(
                        "The property '%s' clashes with a related field "
                        "accessor." % accessor,
                        obj=cls,
                        id='models.E025',
                    )
                )
        return errors

    @classmethod
    def _check_single_primary_key(cls):
        errors = []
        if sum(1 for f in cls._meta.local_fields if f.primary_key) > 1:
            errors.append(
                checks.Error(
                    "The model cannot have more than one field with "
                    "'primary_key=True'.",
                    obj=cls,
                    id='models.E026',
                )
            )
        return errors

    @classmethod
    def _check_index_together(cls):
        """Check the value of "index_together" option."""
        if not isinstance(cls._meta.index_together, (tuple, list)):
            return [
                checks.Error(
                    "'index_together' must be a list or tuple.",
                    obj=cls,
                    id='models.E008',
                )
            ]

        elif any(not isinstance(fields, (tuple, list)) for fields in cls._meta.index_together):
            return [
                checks.Error(
                    "All 'index_together' elements must be lists or tuples.",
                    obj=cls,
                    id='models.E009',
                )
            ]

        else:
            errors = []
            for fields in cls._meta.index_together:
                errors.extend(cls._check_local_fields(fields, "index_together"))
            return errors

    @classmethod
    def _check_unique_together(cls):
        """Check the value of "unique_together" option."""
        if not isinstance(cls._meta.unique_together, (tuple, list)):
            return [
                checks.Error(
                    "'unique_together' must be a list or tuple.",
                    obj=cls,
                    id='models.E010',
                )
            ]

        elif any(not isinstance(fields, (tuple, list)) for fields in cls._meta.unique_together):
            return [
                checks.Error(
                    "All 'unique_together' elements must be lists or tuples.",
                    obj=cls,
                    id='models.E011',
                )
            ]

        else:
            errors = []
            for fields in cls._meta.unique_together:
                errors.extend(cls._check_local_fields(fields, "unique_together"))
            return errors

    @classmethod
    def _check_indexes(cls):
        """Check the fields of indexes."""
        fields = [field for index in cls._meta.indexes for field, _ in index.fields_orders]
        return cls._check_local_fields(fields, 'indexes')

    @classmethod
    def _check_local_fields(cls, fields, option):
        from orun.db import models

        # In order to avoid hitting the relation tree prematurely, we use our
        # own fields_map instead of using get_field()
        forward_fields_map = {
            field.name: field for field in cls._meta._get_fields(reverse=False)
        }

        errors = []
        for field_name in fields:
            try:
                field = forward_fields_map[field_name]
            except KeyError:
                errors.append(
                    checks.Error(
                        "'%s' refers to the nonexistent field '%s'." % (
                            option, field_name,
                        ),
                        obj=cls,
                        id='models.E012',
                    )
                )
            else:
                if isinstance(field.remote_field, models.ManyToManyRel):
                    errors.append(
                        checks.Error(
                            "'%s' refers to a ManyToManyField '%s', but "
                            "ManyToManyFields are not permitted in '%s'." % (
                                option, field_name, option,
                            ),
                            obj=cls,
                            id='models.E013',
                        )
                    )
                elif field not in cls._meta.local_fields:
                    errors.append(
                        checks.Error(
                            "'%s' refers to field '%s' which is not local to model '%s'."
                            % (option, field_name, cls._meta.object_name),
                            hint="This issue may be caused by multi-table inheritance.",
                            obj=cls,
                            id='models.E016',
                        )
                    )
        return errors

    @classmethod
    def _check_ordering(cls):
        """
        Check "ordering" option -- is it a list of strings and do all fields
        exist?
        """
        if cls._meta._ordering_clash:
            return [
                checks.Error(
                    "'ordering' and 'order_with_respect_to' cannot be used together.",
                    obj=cls,
                    id='models.E021',
                ),
            ]

        if cls._meta.order_with_respect_to or not cls._meta.ordering:
            return []

        if not isinstance(cls._meta.ordering, (list, tuple)):
            return [
                checks.Error(
                    "'ordering' must be a tuple or list (even if you want to order by only one field).",
                    obj=cls,
                    id='models.E014',
                )
            ]

        errors = []
        fields = cls._meta.ordering

        # Skip expressions and '?' fields.
        fields = (f for f in fields if isinstance(f, str) and f != '?')

        # Convert "-field" to "field".
        fields = ((f[1:] if f.startswith('-') else f) for f in fields)

        # Skip ordering in the format field1__field2 (FIXME: checking
        # this format would be nice, but it's a little fiddly).
        fields = (f for f in fields if LOOKUP_SEP not in f)

        # Skip ordering on pk. This is always a valid order_by field
        # but is an alias and therefore won't be found by opts.get_field.
        fields = {f for f in fields if f != 'pk'}

        # Check for invalid or nonexistent fields in ordering.
        invalid_fields = []

        # Any field name that is not present in field_names does not exist.
        # Also, ordering by m2m fields is not allowed.
        opts = cls._meta
        valid_fields = set(chain.from_iterable(
            (f.name, f.attname) if not (f.auto_created and not f.concrete) else (f.field.related_query_name(),)
            for f in chain(opts.fields, opts.related_objects)
        ))

        invalid_fields.extend(fields - valid_fields)

        for invalid_field in invalid_fields:
            errors.append(
                checks.Error(
                    "'ordering' refers to the nonexistent field '%s'." % invalid_field,
                    obj=cls,
                    id='models.E015',
                )
            )
        return errors

    @classmethod
    def _check_long_column_names(cls):
        """
        Check that any auto-generated column names are shorter than the limits
        for each database in which the model will be created.
        """
        errors = []
        allowed_len = None
        db_alias = None

        # Find the minimum max allowed length among all specified db_aliases.
        for db in settings.DATABASES:
            # skip databases where the model won't be created
            if not router.allow_migrate_model(db, cls):
                continue
            connection = connections[db]
            max_name_length = connection.ops.max_name_length()
            if max_name_length is None or connection.features.truncates_names:
                continue
            else:
                if allowed_len is None:
                    allowed_len = max_name_length
                    db_alias = db
                elif max_name_length < allowed_len:
                    allowed_len = max_name_length
                    db_alias = db

        if allowed_len is None:
            return errors

        for f in cls._meta.local_fields:
            _, column_name = f.get_attname_column()

            # Check if auto-generated name for the field is too long
            # for the database.
            if f.db_column is None and column_name is not None and len(column_name) > allowed_len:
                errors.append(
                    checks.Error(
                        'Autogenerated column name too long for field "%s". '
                        'Maximum length is "%s" for database "%s".'
                        % (column_name, allowed_len, db_alias),
                        hint="Set the column name manually using 'db_column'.",
                        obj=cls,
                        id='models.E018',
                    )
                )

        for f in cls._meta.local_many_to_many:
            # Skip nonexistent models.
            if isinstance(f.remote_field.through, str):
                continue

            # Check if auto-generated name for the M2M field is too long
            # for the database.
            for m2m in f.remote_field.through._meta.local_fields:
                _, rel_name = m2m.get_attname_column()
                if m2m.db_column is None and rel_name is not None and len(rel_name) > allowed_len:
                    errors.append(
                        checks.Error(
                            'Autogenerated column name too long for M2M field '
                            '"%s". Maximum length is "%s" for database "%s".'
                            % (rel_name, allowed_len, db_alias),
                            hint=(
                                "Use 'through' to create a separate model for "
                                "M2M and then set column_name using 'db_column'."
                            ),
                            obj=cls,
                            id='models.E019',
                        )
                    )

        return errors

    @classmethod
    def _check_constraints(cls):
        errors = []
        for db in settings.DATABASES:
            if not router.allow_migrate_model(db, cls):
                continue
            connection = connections[db]
            if connection.features.supports_table_check_constraints:
                continue
            if any(isinstance(constraint, CheckConstraint) for constraint in cls._meta.constraints):
                errors.append(
                    checks.Warning(
                        '%s does not support check constraints.' % connection.display_name,
                        hint=(
                            "A constraint won't be created. Silence this "
                            "warning if you don't care about it."
                        ),
                        obj=cls,
                        id='models.W027',
                    )
                )
        return errors

    @api.method
    def load_views(cls, views=None, toolbar=False, **kwargs):
        if views is None and 'action' in kwargs:
            Action = apps['ir.action.window']
            action = Action.objects.get(kwargs.get('action'))
            views = {mode: None for mode in action.view_mode.split(',')}
        elif views is None:
            views = {'form': None, 'list': None, 'search': None}

        return {
            'fields': cls.get_fields_info(),
            'views': {
                mode: cls.get_view_info(view_type=mode, view=v, toolbar=toolbar)
                for mode, v in views.items()
            }
        }

    @classmethod
    def get_field_info(cls, field, view_type=None):
        return field.formfield

    @api.method
    def get_fields_info(cls, view_id=None, view_type='form', toolbar=False, context=None, xml=None):
        opts = cls._meta
        if xml is not None:
            fields = get_xml_fields(xml)
            return {
                f.name: cls.get_field_info(f, view_type)
                for f in [opts.fields[f.attrib['name']] for f in fields if 'name' in f.attrib] if f
            }
        if view_type == 'search':
            searchable_fields = opts.searchable_fields
            if searchable_fields:
                return {f.name: cls.get_field_info(f, view_type) for f in searchable_fields}
            return {}
        else:
            r = {}
            for field in opts.fields:
                r[field.name] = cls.get_field_info(field, view_type)
            return r

    @classmethod
    def _get_default_view(cls, view_type):
        from orun.template.loader import select_template
        template = select_template(
            [
                'views/%s/%s.jinja2' % (cls._meta.name, view_type),
                'views/%s/%s.html' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.addon.schema, view_type),
                'views/%s.jinja2' % view_type,
            ], using='jinja2'
        )
        return template.render(context=dict(opts=cls._meta, _=gettext))

    @classmethod
    def _get_default_form_view(cls):
        return cls._get_default_view(view_type='form')

    @classmethod
    def _get_default_list_view(cls):
        pass

    @classmethod
    def _get_default_search_view(cls):
        pass

    @api.method
    def write(self, data):
        if isinstance(data, dict):
            data = [data]
        res = []
        for row in data:
            pk = row.pop('id', None)
            if pk:
                #_cache_change = _cache_change or cls.check_permission('change')
                obj = self.get(pk)
            else:
                #_cache_create = _cache_create or cls.check_permission('create')
                obj = self()
            self._from_json(obj, row)
            res.append(obj.pk)
        return res

    @api.method
    def destroy(self, ids):
        # self.check_permission('delete')
        ids = [v for v in self._search({'pk__in': ids}).only('pk')]
        r = []
        if not ids:
            raise ObjectDoesNotExist()
        for obj in ids:
            r.append(obj.pk)
            obj._destroy()
        return {
            'ids': r,
        }

    def _destroy(self):
        self.delete()

    @api.method
    def field_change_event(cls, field, record, *args, **kwargs):
        for fn in cls._meta.field_change_event[field]:
            record = fn(cls, record)
        return record

    @api.record
    def _proxy_field_change(self, field):
        obj = getattr(self, field.proxy_field[0])
        if obj is not None:
            obj = getattr(obj, field.proxy_field[1])
        return {
            'value': {field.name: obj}
        }

    @api.method
    def get(self, id):
        if id:
            obj = self._search().get(pk=id)
            obj.__serialize__ = True
            return obj
        else:
            raise self.DoesNotExist()

    @api.method
    def create_name(self, name, *args, **kwargs):
        context = kwargs.get('context')
        opts = self._meta
        assert opts.title_field
        data = {opts.title_field: name}
        if context:
            for k, v in context.items():
                if k.startswith('default_'):
                    data[k[8:]] = v
        return self.objects.create(**data)._get_instance_label()

    @api.method
    def reorder(cls, ids):
        objs = cls.objects.only('pk').filter(pk__in=ids)
        sequence = {id: i for i, id in enumerate(ids)}
        for obj in objs:
            obj.sequence = sequence[obj.pk]
        cls.objects.bulk_update(objs, [cls._meta.sequence_field])

    @api.method
    def group_by(self, grouping, where):
        field_name = grouping[0]
        field = self._meta.fields[field_name]
        if field.group_choices:
            qs = field.get_group_choices(self, where)
        else:
            qs = self._search(where)
            qs = qs.values(field.name).annotate(Count(field.name)).order_by(field.name)
        count_name = '%s__count' % field_name
        count_ret = '%s__count' % field_name
        res = []
        if field.many_to_one:
            for row in qs:
                key = row[field.name]
                res.append({
                    field_name: field.remote_field.model.objects.get(pk=key)._get_instance_label() if key else None,
                    count_ret: row[count_name],
                })
            return res
        return list(qs)

    def _get_instance_label(self):
        return (self.pk, str(self))

    @api.method
    def get_formview_action(self, id=None):
        return {
            'action_type': 'ir.action.window',
            'model': self._meta.name,
            'object_id': id,
            'view_mode': 'form',
            'view_type': 'form',
            'target': 'current',
            'views': {
                'form': None,
            },
            'context': self.env.context,
        }

    @api.method
    def search(cls, fields=None, count=None, page=None, limit=None, **kwargs):
        qs = cls._search(fields=fields, **kwargs)
        if count:
            count = qs.count()
        if limit is None:
            limite = CHOICES_PAGE_LIMIT
        elif limit == -1:
            limit = None
        if page and limit:
            page = int(page)
            limit = int(limit)
            qs = qs[(page - 1) * limit:page * limit]
        defer = qs.query.deferred_loading[0]
        return {
            'data': [obj.to_json(fields=fields, exclude=defer) for obj in qs],
            'count': count,
        }

    @classmethod
    def _search(self, where=None, fields=None, domain=None, join=None, **kwargs):
        # self.check_permission('read')
        qs = self.objects.all()
        # load only selected fields
        if fields:
            if 'record_name' in fields:
                fields.append(self._meta.title_field)
            fields = [f.attname for f in [self._meta.fields[f] for f in fields] if f.concrete]
            pk = self._meta.pk.attname
            if pk not in fields:
                fields.append(pk)
            if fields:
                qs = qs.only(*fields)
        elif self._meta.deferred_fields:
            qs.defer(self._meta.deferred_fields)

        if where:
            if isinstance(where, list):
                for w in where:
                    qs = qs.filter(**w)
            elif isinstance(where, dict):
                qs = qs.filter(**where)
            elif where is not None:
                qs = qs.filter(where)
        if domain:
            qs = qs.filter(**domain)
        # filter active records only
        if self._meta.active_field:
            qs = qs.filter(**{self._meta.active_field: True})
        return qs

    @api.method
    def search_name(
        self, name=None, count=None, page=None, label_from_instance=None, name_fields=None, *args, exact=False,
        **kwargs
    ):
        where = kwargs.get('params')
        join = []
        q = None
        if name:
            if name_fields is None:
                name_fields = chain(*(_resolve_fk_search(f, join) for f in self._meta.get_name_fields()))
            if exact:
                q = reduce(lambda f1, f2: f1 | f2, [Q(**{f'{f.name}__iexact': name}) for f in name_fields])
            else:
                q = reduce(lambda f1, f2: f1 | f2, [Q(**{f'{f.name}__icontains': name}) for f in name_fields])
        if where:
            if q is None:
                q = Q(**where)
            else:
                q &= Q(**where)
        if q is not None:
            kwargs = {'where': q}
        qs = self._search(*args, **kwargs)
        limit = kwargs.get('limit') or 10
        if count:
            count = qs.count()
        if page:
            page = int(page)
            qs = qs[(page - 1) * limit:page * limit]
        else:
            qs = qs[:limit]
        if isinstance(label_from_instance, list):
            label_from_instance = lambda obj, label_from_instance=label_from_instance: (obj.pk, ' - '.join([str(getattr(obj, f, '')) for f in label_from_instance if f in self._meta.fields_dict]))
        if callable(label_from_instance):
            res = [label_from_instance(obj) for obj in qs]
        else:
            res = [obj._get_instance_label() for obj in qs]
        return {
            'count': count,
            'items': res,
        }

    @classmethod
    def _from_json(self, instance, data, **kwargs):
        data.pop('id', None)
        children = {}
        for k, v in data.items():
            field = instance.__class__._meta.fields[k]
            v = field.to_python(v)
            if field.one_to_many or field.many_to_many:
                children[field] = v
            elif field.many_to_one and isinstance(v, (str, int)):
                setattr(instance, field.attname, v)
            elif field.set:
                field.set(instance, v)
            else:
                setattr(instance, k, v)

        # todo fix full clean
        # instance.full_clean()
        if instance.pk:
            flds = data.keys() - [f.name for f in children]
            if flds:
                # todo optimize update modified fields only
                instance.save(**kwargs)
        else:
            instance.save(**kwargs)

        for child, v in children.items():
            try:
                if child.many_to_many:
                    v = v or []
                    if v:
                        v = list(
                            child.remote_field.model.objects.only('pk').filter(
                                **{'%s__in' % child.remote_field.model._meta.pk.name: v}
                            )
                        )
                    setattr(instance, child.name, v)
                else:
                    child.set(instance, v)
            except ValidationError as e:
                for k, v in dict(e.error_dict).items():
                    e.error_dict[f"{child.name}.{k}"] = e.error_dict.pop(k)
                raise

        return instance

    def to_json(self, fields=None, exclude=None, view_type=None):
        opts = self._meta
        data = {}
        if fields:
            deferred_fields = []
        else:
            deferred_fields = opts.deferred_fields
        for f in opts.fields:
            if f in deferred_fields:
                continue
            if not f.serialize:
                continue
            if fields and f.name not in fields:
                continue
            if exclude and f.name in exclude:
                continue
            data[f.name] = f.to_json(getattr(self, f.name, None))
        if 'id' not in data:
            data['id'] = self.pk
        return data

    @api.method
    def get_field_choices(self, field, q=None, count=False, ids=None, page=None, exact=False, limit=None, **kwargs):
        field_name = field
        field = self._meta.fields[field_name]
        related_model = apps[field.remote_field.model]
        search_params = {}
        if limit:
            search_params['limit'] = limit
        if field.many_to_many:
            field = field.remote_field.target_field
        if ids is None:
            search_params['name_fields'] = kwargs.get('name_fields', (field.name_fields is not None and [related_model._meta.fields_dict[f] for f in field.name_fields]) or None)
            search_params['name'] = q
            search_params['page'] = page
            search_params['count'] = count
            domain = kwargs.get('domain', field.domain)
            if domain:
                search_params['params'] = domain
        else:
            if isinstance(ids, (list, tuple)):
                search_params['params'] = {'pk__in': ids}
            else:
                search_params['params'] = {'pk': ids}
        label_from_instance = kwargs.get('label_from_instance', field.label_from_instance or kwargs.get('name_fields'))
        return related_model.search_name(label_from_instance=label_from_instance, exact=exact, **search_params)

    @api.method
    def get_view_info(self, view_type, view=None, toolbar=False):
        View = apps['ui.view']
        model = apps['ir.model']

        if view is None:
            view = list(View.objects.filter(mode='primary', view_type=view_type, model=self._meta.name))
            if view:
                view = view[0]
        elif isinstance(view, (int, str)):
            view = View.objects.get(view)

        if view:
            xml_content = view.get_xml(self, {'request': self.env.request})
            r = {
                'content': etree.tostring(xml_content, encoding='utf-8').decode('utf-8'),
                'fields': self.get_fields_info(view_type=view_type, xml=xml_content)
            }
        else:
            content = self._get_default_view(view_type=view_type)
            r = {
                'content': content,
                'fields': self.get_fields_info(view_type=view_type, xml=content),
            }
        if toolbar and view_type != 'search':
            bindings = apps['ir.action'].get_bindings(self._meta.name)
            r['toolbar'] = {
                'print': [action.to_json() for action in bindings['print'] if view_type == 'list' or not action.multiple],
                'action': [action.to_json() for action in bindings['action'] if view_type == 'list' or not action.multiple],
            }
        return r

    def __copy__(self):
        new_item = {}
        for f in self._meta.copyable_fields:
            if not f.name:
                continue
            v = getattr(self, f.name)
            if self._meta.title_field == f.name:
                new_item[f.name] = gettext('%s (copy)') % v
            elif f.one_to_many:
                values = new_item[f.name] = [
                    {
                        'action': 'CREATE',
                        # remove parent record information
                        'values': {k: v for k, v in copy.copy(obj).items() if k != f.remote_field.field.name},
                    }
                    for obj in v
                ]
            else:
                new_item[f.name] = f.to_json(v)
        return new_item

    @api.method
    def copy(cls, id):
        # ensure permission
        instance = cls.get(id)
        return copy.copy(instance)

    @api.method
    def get_defaults(self, context=None, *args, **kwargs):
        r = {}
        defaults = context or {}
        for f in self._meta.fields:
            if 'default_' + f.name in defaults:
                val = r[f.name] = defaults['default_' + f.name]
                if val and isinstance(f, ForeignKey):
                    r[f.name] = [val, str(f.remote_field.model.objects.get(pk=val))]
            elif f.editable:
                if f.default is not NOT_PROVIDED:
                    if callable(f.default):
                        r[f.name] = f.default()
                    else:
                        r[f.name] = f.default
                elif isinstance(f, BooleanField):
                    r[f.name] = False
        if 'creation_name' in kwargs and self._meta.title_field:
            r[self._meta.title_field] = kwargs['creation_name']
        return r or None


############################################
# HELPER FUNCTIONS (CURRIED MODEL METHODS) #
############################################

# ORDERING METHODS #########################

def method_set_order(self, ordered_obj, id_list, using=None):
    if using is None:
        using = DEFAULT_DB_ALIAS
    order_wrt = ordered_obj._meta.order_with_respect_to
    filter_args = order_wrt.get_forward_related_filter(self)
    # FIXME: It would be nice if there was an "update many" version of update
    # for situations like this.
    with transaction.atomic(using=using, savepoint=False):
        for i, j in enumerate(id_list):
            ordered_obj.objects.filter(pk=j, **filter_args).update(_order=i)


def method_get_order(self, ordered_obj):
    order_wrt = ordered_obj._meta.order_with_respect_to
    filter_args = order_wrt.get_forward_related_filter(self)
    pk_name = ordered_obj._meta.pk.name
    return ordered_obj.objects.filter(**filter_args).values_list(pk_name, flat=True)


def make_foreign_order_accessors(model, related_model):
    setattr(
        related_model,
        'get_%s_order' % model.__name__.lower(),
        partialmethod(method_get_order, model)
    )
    setattr(
        related_model,
        'set_%s_order' % model.__name__.lower(),
        partialmethod(method_set_order, model)
    )

########
# MISC #
########


def _resolve_fk_search(field, join_list):
    if isinstance(field, ForeignKey):
        rel_model = apps[field.remote_field.model]
        join_list.append(rel_model)
        return rel_model._meta.get_name_fields()
    return [field]


def model_unpickle(model_id):
    """Used to unpickle Model subclasses with deferred fields."""
    if isinstance(model_id, str):
        model = apps.models[model_id]
    else:
        # Backwards compat - the model was cached directly in earlier versions.
        model = model_id
    return model.__new__(model)


model_unpickle.__safe_for_unpickle__ = True
