import copy
from typing import Sequence, List, Optional, Dict, Union, TYPE_CHECKING
import inspect
from collections import defaultdict
from functools import partialmethod, partial, wraps

from orun.apps import apps
from orun.conf import settings
from orun.core.exceptions import FieldDoesNotExist, ImproperlyConfigured
from orun.db import connections
from orun.db.models import AutoField, Manager, UniqueConstraint
from orun.db.models.fields import CharField, Fields, Field
from orun.db.models.query_utils import PathInfo
from orun.utils.translation import gettext_lazy as _
from orun.utils.datastructures import ImmutableList, OrderedSet
from orun.utils.functional import cached_property
from orun.utils.text import camel_case_to_spaces, format_lazy
from orun.utils.translation import override
from orun.utils.module_loading import import_string
from orun.db.models.indexes import Index
from orun.db import metadata
if TYPE_CHECKING:
    from orun.db.models.constraints import Constraint


PROXY_PARENTS = object()

EMPTY_RELATION_TREE = ()

IMMUTABLE_WARNING = (
    "The return type of '%s' should never be mutated. If you want to manipulate this list "
    "for your own use, make a copy first."
)

DEFAULT_NAMES = (
    'verbose_name', 'verbose_name_plural', 'db_table', 'ordering',
    'unique_together', 'permissions', 'get_latest_by', 'order_with_respect_to',
    'schema', 'db_tablespace', 'abstract', 'managed', 'proxy', 'swappable',
    'auto_created', 'index_together', 'apps', 'default_permissions',
    'select_on_save', 'default_related_name', 'required_db_features',
    'required_db_vendor', 'base_manager_name', 'default_manager_name',
    'indexes', 'constraints',
)


def normalize_together(option_together):
    """
    option_together can be either a tuple of tuples, or a single
    tuple of two strings. Normalize it to a tuple of tuples, so that
    calling code can uniformly expect that.
    """
    try:
        if not option_together:
            return ()
        if not isinstance(option_together, (tuple, list)):
            raise TypeError
        first_element = option_together[0]
        if not isinstance(first_element, (tuple, list)):
            option_together = [option_together]
        # Normalize everything to tuples
        return tuple(tuple(ot) for ot in option_together)
    except TypeError:
        # If the value of option_together isn't valid, return it
        # verbatim; this will be picked up by the check framework later.
        return option_together


def make_immutable_fields_list(name, data):
    return ImmutableList(data, warning=IMMUTABLE_WARNING % name)


class Options:
    exposed = True
    default_apps = apps

    abstract = False
    proxy = False
    swapped = False
    overridden = False
    db_table: str = None
    db_schema: str = None
    db_tablespace: str = None
    tablename: str = None
    name: str = None
    concrete = None
    constraints: List['Constraint'] = None
    indexes: List[Index] = None
    addon = None
    schema = None
    model = None
    inherited = False
    inherits = None
    object_name: str = None
    model_name: Optional[str] = None
    pk: 'Field' = None
    apps = None
    ordering = None
    order_with_respect_to = None
    managed = True
    verbose_name: str = None
    verbose_name_plural: str = None
    default_related_name: str = None
    auto_created = False
    field_change_event = None
    name_field = None
    status_field = None
    sequence_field: str = None
    active_field: str = None
    field_groups = None
    log_changes = True
    select_on_save = False
    default_permissions = {'create': 'Create', 'read': 'Read', 'update': 'Update', 'delete': 'Delete'}
    permissions = {}
    unique_together: List[str] = None
    parent_path_field: str = None

    has_natural_key: bool = None
    natural_key: str = None

    help_text: str = None

    #
    local_many_to_many: List['Field'] = None

    FORWARD_PROPERTIES = {
        'many_to_many', 'concrete_fields', 'local_concrete_fields',
        '_forward_fields_map', 'managers', 'managers_map', 'base_manager',
        'default_manager',
    }
    REVERSE_PROPERTIES = {'related_objects', 'fields_map', '_relation_tree'}

    def __init__(self):
        self.apps = getattr(self, 'registry', apps)
        self.parents = {}
        self._get_fields_cache = {}
        self.field_change_event = defaultdict(list)
        self.fields_events = defaultdict(list)
        self.local_fields = []
        self.fields: Union[Sequence[Field], Dict[str, Field]] = Fields(self)
        self.derived_models = []
        self.local_managers = []
        self.base_manager_name = None
        self.default_manager_name = None
        self.model_name = None
        self._ordering_clash = False
        if not self.unique_together:
            self.unique_together = []
        self.index_together = []
        self.get_latest_by = None
        # self.order_with_respect_to = None
        self.db_tablespace = settings.DEFAULT_TABLESPACE
        self.required_db_features = []
        self.required_db_vendor = None
        self.auto_field = None
        self.concrete_model = None
        self.related_fkey_lookups = []
        # For any class that is a proxy (including automatically created
        # classes for deferred object loading), proxy_for_model tells us
        # which class this model is proxying. Note that proxy_for_model
        # can create a chain of proxy models. For non-proxy models, the
        # variable is always None.

    def __init_subclass__(cls, **kwargs):
        from orun.db import connection
        ops = connection.ops
        cls.parents = {}

        if not cls.abstract:
            if cls.schema is None:
                cls.schema = cls.model.__module__.split('.', 1)[0]
            if cls.object_name is None:
                cls.object_name = cls.model.__name__
            if cls.model_name is None:
                cls.model_name = cls.object_name.lower()
            if cls.name is None and not cls.abstract:
                cls.name = f'{cls.schema}.{camel_case_to_spaces(cls.object_name).replace(" ", ".")}'

            if cls.db_table is None:
                cls.tablename = cls.db_table = cls.name.replace('.', '_').lower()
                if cls.db_schema is None and cls.addon:
                    cls.db_schema = cls.addon.db_schema or ''
                cls.qualname = cls.tablename = cls.db_table
                if cls.db_schema and cls.name.startswith(cls.db_schema + '.'):
                    cls.tablename = cls.name.split('.', 1)[-1].replace('.', '_')
                    cls.qualname = f'{cls.db_schema}.{cls.tablename}'
                    cls.db_table = ops.get_tablename(cls.db_schema, cls.tablename)
            else:
                cls.qualname = cls.tablename = cls.db_table

            if cls.inherited is None:
                cls.inherited = cls.extension or bool(cls.parents)
            if cls.concrete is None:
                cls.concrete = not cls.abstract and bool(cls.db_table)
            if not cls.concrete:
                cls.managed = False

    def get_metadata(self, editor):
        from .triggers import collect_triggers
        table = metadata.Table(
            name=self.db_table, schema=self.db_schema, model=self.name, tablename=self.db_table,
        )
        # collect fields
        for f in self.local_concrete_fields:
            if f.column:
                f.contribute_to_table(editor, table)
        # collect constraints
        # collect_triggers(self, editor)
        return table

    @property
    def label(self):
        return '%s.%s' % (self.schema, self.object_name)

    @property
    def label_lower(self):
        return '%s.%s' % (self.schema, self.model_name)

    @classmethod
    def from_model(cls, meta, model, parents=None, attrs=None):
        is_proxy = False
        meta_attrs = {}
        if meta is not None:
            meta_attrs.update({k: v for k, v in meta.__dict__.items() if not k.startswith('__')})
            # if proxy, generate a new model name
            is_proxy = meta_attrs.get('proxy')
        if attrs:
            meta_attrs.update(attrs)

        if not parents:
            bases = [base.Meta for base in model.__bases__ if hasattr(base, 'Meta') and base.Meta]
        else:
            bases = [base.Meta for base in parents if hasattr(base, 'Meta') and base.Meta]
        if bases:
            bases = tuple(bases)
            if 'field_groups' in meta_attrs and meta_attrs.get('override'):
                parent = parents[0]
                if not parent.Meta.field_groups:
                    parent.Meta.field_groups = {}
                parent.Meta.field_groups.update(meta_attrs['field_groups'])
            field_events = defaultdict(list)
            for b in bases:
                if b.field_change_event:
                    field_events.update(b.field_change_event)
            meta_attrs['field_change_event'] = field_events
        else:
            bases = (Options,)

        meta_attrs.setdefault('abstract', False)
        meta_attrs.setdefault('proxy', False)
        meta_attrs.setdefault('override', False)
        meta_attrs['swapped'] = False
        if not is_proxy:
            meta_attrs.setdefault('db_table', None)
        if not meta_attrs.get('override') and 'name' not in meta_attrs:
            meta_attrs['name'] = meta_attrs['object_name'] = meta_attrs['model_name'] = None
        meta_attrs.setdefault('bases', parents)
        meta_attrs.setdefault('inherited', bool(parents))
        meta_attrs['model'] = model

        opts: type[Options] = type('Options', bases, meta_attrs)
        if opts.constraints is None:
            opts.constraints = []
        if opts.indexes is None:
            opts.indexes = []
        if opts.field_change_event is None:
            opts.field_change_event = defaultdict(list)
        if opts.has_natural_key is None and opts.natural_key:
            opts.has_natural_key = True
        elif opts.name_field and opts.has_natural_key is None:
            opts.has_natural_key = True
            opts.natural_key = opts.name_field
        return opts

    def contribute_to_class(self, cls, name):
        cls._meta = self
        self.model = cls
        # First, construct the default values for these options.
        self.object_name = cls.__name__
        self.model_name = self.object_name.lower()
        if self.verbose_name is None:
            self.verbose_name = camel_case_to_spaces(self.object_name)

        if self.verbose_name_plural is None:
            self.verbose_name_plural = format_lazy('{}s', self.verbose_name)

        # Store the original user-defined values for each option,
        # for use when serializing the model definition
        self.original_attrs = {}
        self.unique_together = normalize_together(self.unique_together)
        self.index_together = normalize_together(self.index_together)

        # App label/class name interpolation for names of constraints and
        # indexes.
        if not getattr(cls._meta, 'abstract', False):
            for attr_name in {'constraints', 'indexes'}:
                objs = getattr(self, attr_name, [])
                setattr(self, attr_name, self._format_names_with_class(cls, objs))

    def _prepare(self, model):
        if self.ordering is None:
            self.__class__.ordering = ('pk',)
        if isinstance(self.ordering, str):
            self.__class__.ordering = [self.ordering]
        if self.order_with_respect_to:
            # The app registry will not be ready at this point, so we cannot
            # use get_field().
            query = self.order_with_respect_to
            try:
                self.order_with_respect_to = next(
                    f for f in self._get_fields(reverse=False)
                    if f.name == query or f.attname == query
                )
            except StopIteration:
                raise FieldDoesNotExist("%s has no field named '%s'" % (self.object_name, query))

            self.ordering = ('_order',)
            # if not any(isinstance(field, OrderWrt) for field in model._meta.local_fields):
            #     f = OrderWrt()
            #     model.add_to_class('_order', f)
            #     self.local_fields.append(f)
        else:
            self.order_with_respect_to = None

        if not self.inherits and not self.abstract and 'record_name' not in self.fields:
            record_title = CharField(
                verbose_name=self.verbose_name, auto_created=True, getter='__str__', editable=False, concrete=False
            )
            model.add_to_class('record_name', record_title)
            self.local_fields.append(record_title)

        if self.pk is None:
            if self.parents:
                # Promote the first parent link in lieu of adding yet another
                # field.
                field = next(iter(self.parents.values()))
                # Look for a local field with the same name as the
                # first parent link. If a local field has already been
                # created, use it instead of promoting the parent
                already_created = [fld for fld in self.local_fields if fld.name == field.name]
                if already_created:
                    field = already_created[0]
                field.primary_key = True
                self.setup_pk(field)
                if not field.remote_field.parent_link:
                    raise ImproperlyConfigured(
                        'Add parent_link=True to %s.' % field,
                    )
            else:
                auto = import_string(settings.DEFAULT_AUTO_FIELD)(verbose_name='ID', primary_key=True, auto_created=True)
                model.add_to_class('id', auto)

                # TODO move to audit log
                if self.log_changes and 'created_by' not in self.fields:
                    from orun.db.models.fields import DateTimeField
                    from orun.db.models.fields.related import ForeignKey
                    from orun.contrib.auth import current_user_id
                    user_model = settings.AUTH_USER_MODEL
                    model.add_to_class('created_by', ForeignKey(
                        user_model, verbose_name=_('Created by'),
                        on_insert_value=current_user_id,
                        auto_created=True, editable=False, defer=True, db_index=False, copy=False,
                        db_constraint=False,
                    ))
                    model.add_to_class('created_on', DateTimeField(
                        auto_now_add=True, verbose_name=_('Created on'),
                        auto_created=True, editable=False, defer=True, copy=False
                    ))
                    model.add_to_class('updated_by', ForeignKey(
                        user_model, verbose_name=_('Updated by'),
                        on_update_value=current_user_id,
                        auto_created=True, editable=False, defer=True, db_index=False, copy=False,
                        db_constraint=False,
                    ))
                    model.add_to_class('updated_on', DateTimeField(
                        auto_now=True, verbose_name=_('Updated on'),
                        auto_created=True, editable=False, defer=True, copy=False
                    ))

    @classmethod
    def create_helper(cls, model, attrs, meta):
        if meta:
            assert not hasattr(meta, 'name')
            # attrs = {'__model__': model}
            for k, v in meta.__dict__.items():
                if k.startswith('_'):
                    continue
                if k == 'field_groups' and model._meta.field_groups:
                    model._meta.field_groups.update(v)
                elif k == 'field_overrides':
                    for field_name, _attrs in meta.field_overrides.items():
                        f = model._meta.fields[field_name]
                        for fk, fv in _attrs.items():
                            attr = getattr(f, fk, None)
                            if callable(attr):
                                attr(fv)
                            else:
                                setattr(f, fk, fv)
                else:
                    setattr(model._meta, k, v)

        class_helper = type('ModelHelper', (ModelHelper,), attrs)
        attrs.pop('__module__', None)
        attrs.pop('__qualname__', None)
        for k, v in attrs.items():
            if attr := getattr(model, k, None):
                if inspect.ismethod(attr):
                    attr = attr.__func__
                setattr(class_helper, k, attr)
                if inspect.isfunction(v):
                    v = method_helper(v, class_helper)
                elif isinstance(v, classmethod):
                    v = classmethod_helper(v, class_helper)
                if getattr(v, 'exposed', None):
                    v.exposed = True
            if hasattr(v, 'contribute_to_class'):
                model.add_to_class(k, v)
            else:
                setattr(model, k, v)

        if hasattr(model, '_meta'):
            model._meta.__class__.overridden = True

    def add_manager(self, manager):
        self.local_managers.append(manager)
        self._expire_cache()

    def add_field(self, field):
        # if field.is_relation and field.many_to_many:
        #     self.local_many_to_many.append(field)

        if field.local:
            if field.name in self.fields:
                raise ValueError(f'Field "{field.name}" duplicated. Use the fields_override attribute to extend a field.')
            self.local_fields.append(field)
            # add aggregation trigger
            if field.aggregate:
                self.add_field_aggregation(field)
        elif field.many_to_many:
            field.concrete = False

        for link in self.derived_models:
            new_field = copy.deepcopy(field)
            new_field.local = self.abstract
            if self.abstract:
                new_field.model = link
            link.add_to_class(field.name, new_field)
            field = new_field
        if self.pk is None and field.local and field.primary_key:
            self.pk = field

        # Special field names
        if self.name_field is None and field.name == 'name':
            self.__class__.name_field = field.name
        elif field.name == 'status':
            self.__class__.status_field = field.name
            field.widget = 'StatusField'
        elif self.sequence_field is None and field.name == 'sequence':
            self.__class__.sequence_field = field.name
        elif self.active_field is None and field.name == 'active':
            self.__class__.active_field = field.name

        self.fields.append(field)

        # If the field being added is a relation to another known field,
        # expire the cache on this field and the forward cache on the field
        # being referenced, because there will be new relationships in the
        # cache. Otherwise, expire the cache of references *to* this field.
        # The mechanism for getting at the related model is slightly odd -
        # ideally, we'd just ask for field.related_model. However, related_model
        # is a cached property, and all the models haven't been loaded yet, so
        # we need to make sure we don't cache a string reference.
        if field.is_relation and hasattr(field.remote_field, 'model') and field.remote_field.model:
            try:
                field.remote_field.model._meta._expire_cache(forward=False)
            except AttributeError:
                pass
            self._expire_cache()
        else:
            self._expire_cache(reverse=False)

    def setup_pk(self, field):
        if not self.pk and field.primary_key:
            self.pk = field
            field.serialize = False

    def __repr__(self):
        return '<Options for %s>' % self.object_name

    def __str__(self):
        return self.model.name

    def can_migrate(self, connection):
        """
        Return True if the model can/should be migrated on the `connection`.
        `connection` can be either a real connection or a connection alias.
        """
        if self.proxy or self.swapped or not self.managed or (self.addon and not self.addon.managed):
            return False
        if isinstance(connection, str):
            connection = connections[connection]
        if self.required_db_vendor:
            return self.required_db_vendor == connection.vendor
        if self.required_db_features:
            return all(getattr(connection.features, feat, False)
                       for feat in self.required_db_features)
        return True

    @property
    def verbose_name_raw(self):
        """Return the untranslated verbose name."""
        with override(None):
            return str(self.verbose_name)

    @cached_property
    def managers(self):
        managers = []
        seen_managers = set()
        bases = (b for b in self.model.mro() if hasattr(b, '_meta') and b._meta)
        for depth, base in enumerate(bases):
            for manager in base._meta.local_managers:
                if manager.name in seen_managers:
                    continue

                manager = copy.copy(manager)
                manager.model = self.model
                seen_managers.add(manager.name)
                managers.append((depth, manager.creation_counter, manager))

        return make_immutable_fields_list(
            "managers",
            (m[2] for m in sorted(managers)),
        )

    def get_name_field(self):
        return self.fields[self.name_field]

    def get_name_fields(self) -> List[Field]:
        if self.field_groups and 'name_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['name_fields']]
        if self.name_field:
            return [self.fields[self.name_field]]
        return []

    def get_active_field(self):
        return self.fields[self.active_field]

    @cached_property
    def managers_map(self):
        return {manager.name: manager for manager in self.managers}

    @cached_property
    def base_manager(self):
        base_manager_name = self.base_manager_name
        if not base_manager_name:
            # Get the first parent's base_manager_name if there's one.
            for parent in self.model.mro()[1:]:
                if getattr(parent, '_meta', None):
                    if parent._base_manager.name != '_base_manager':
                        base_manager_name = parent._base_manager.name
                    break

        if base_manager_name:
            try:
                return self.managers_map[base_manager_name]
            except KeyError:
                raise ValueError(
                    "%s has no manager named %r" % (
                        self.object_name,
                        base_manager_name,
                    )
                )

        manager = Manager()
        manager.name = '_base_manager'
        manager.model = self.model
        manager.auto_created = True
        return manager

    @cached_property
    def default_manager(self):
        default_manager_name = self.default_manager_name
        if not default_manager_name and not self.local_managers:
            # Get the first parent's default_manager_name if there's one.
            for parent in self.model.mro()[1:]:
                if hasattr(parent, '_meta') and parent._meta:
                    default_manager_name = parent._meta.default_manager_name
                    break

        if default_manager_name:
            try:
                return self.managers_map[default_manager_name]
            except KeyError:
                raise ValueError(
                    "%s has no manager named %r" % (
                        self.object_name,
                        default_manager_name,
                    )
                )

        if self.managers:
            return self.managers[0]

    @cached_property
    def concrete_fields(self):
        """
        Return a list of all concrete fields on the model and its parents.
        """
        return make_immutable_fields_list(
            "concrete_fields", (f for f in self.fields if f.concrete and not f.many_to_many)
        )

    @cached_property
    def selectable_fields(self):
        """
        Return a list of all selectable fields on the model and its parents.
        """
        return make_immutable_fields_list(
            "selectable_fields", (f for f in self.fields if f.selectable)
        )

    @cached_property
    def local_concrete_fields(self):
        """
        Return a list of all concrete fields on the model.
        """
        return make_immutable_fields_list(
            "local_concrete_fields", (f for f in self.local_fields if f.concrete and not f.many_to_many)
        )

    @cached_property
    def deferred_fields(self):
        """
        Return a list of deferred fields on the model.
        """
        return make_immutable_fields_list(
            "deferred_fields", (f.name for f in self.fields if f.defer)
        )

    @property
    def editable_fields(self):
        return [f for f in self.fields if f.editable]

    @property
    def list_fields(self):
        if self.field_groups and 'list_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['list_fields']]
        return [f for f in self.editable_fields if not f.one_to_many]

    @property
    def available_fields(self):
        """Fields available for list customization"""
        if self.field_groups and 'available_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['available_fields']]

    @property
    def form_fields(self):
        if self.field_groups and 'form_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['form_fields']]
        else:
            return self.editable_fields

    def get_fields_group(self, group: str):
        if self.field_groups and group in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups[group]]

    @property
    def copyable_fields(self):
        return [f for f in self.fields if f.copy]

    @property
    def searchable_fields(self):
        if self.field_groups and 'searchable_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['searchable_fields']]
        elif self.name_field:
            return [self.get_name_field()]
        return []

    @property
    def auto_report_fields(self):
        if self.field_groups and 'auto_report' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['auto_report']]
        elif self.name_field:
            return [self.pk, self.fields[self.name_field]]
        return []

    @property
    def grouping_fields(self):
        if self.field_groups and 'grouping_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['grouping_fields']]

    @cached_property
    def related_objects(self):
        """
        Return all related objects pointing to the current model. The related
        objects can come from a one-to-one, one-to-many, or many-to-many field
        relation type.

        Private API intended only to be used by Orun itself; get_fields()
        combined with filtering of field properties is the public API for
        obtaining this field list.
        """
        all_related_fields = self._get_fields(forward=False, reverse=True, include_hidden=True)
        return make_immutable_fields_list(
            "related_objects",
            (obj for obj in all_related_fields if not obj.hidden or obj.field.many_to_many)
        )

    @cached_property
    def many_to_many(self):
        """
        Return a list of all many to many fields on the model and its parents.

        Private API intended only to be used by Orun itself; get_fields()
        combined with filtering of field properties is the public API for
        obtaining this list.
        """
        return make_immutable_fields_list(
            "many_to_many",
            (f for f in self._get_fields(reverse=False) if f.is_relation and f.many_to_many)
        )

    @cached_property
    def _forward_fields_map(self):
        res = {}
        fields = self._get_fields(reverse=False)
        for field in fields:
            res[field.name] = field
            # Due to the way Orun's internals work, get_field() should also
            # be able to fetch a field by attname. In the case of a concrete
            # field with relation, includes the *_id name too
            try:
                res[field.attname] = field
            except AttributeError:
                pass
        return res

    @cached_property
    def fields_map(self):
        res = {}
        fields = self._get_fields(forward=False, include_hidden=True)
        for field in fields:
            res[field.name] = field
            # Due to the way Orun's internals work, get_field() should also
            # be able to fetch a field by attname. In the case of a concrete
            # field with relation, includes the *_id name too
            try:
                res[field.attname] = field
            except AttributeError:
                pass
        return res

    def get_field(self, field_name):
        """
        Return a field instance given the name of a forward or reverse field.
        """
        if field_name == 'pk':
            return self.pk
        try:
            # In order to avoid premature loading of the relation tree
            # (expensive) we prefer checking if the field is a forward field.
            return self._forward_fields_map[field_name]
        except KeyError:
            # If the app registry is not ready, reverse fields are
            # unavailable, therefore we throw a FieldDoesNotExist exception.
            if not self.apps.models_ready:
                raise FieldDoesNotExist(
                    "%s has no field named '%s'. The app cache isn't ready yet, "
                    "so if this is an auto-created related field, it won't "
                    "be available yet." % (self.object_name, field_name)
                )

        try:
            # Retrieve field instance by name from cached or just-computed
            # field map.
            return self.fields_map[field_name]
        except KeyError:
            raise FieldDoesNotExist("%s has no field named '%s'" % (self.object_name, field_name))

    def get_base_chain(self, model):
        """
        Return a list of parent classes leading to `model` (ordered from
        closest to most distant ancestor). This has to handle the case where
        `model` is a grandparent or even more distant relation.
        """
        if not self.parents:
            return []
        if model in self.parents:
            return [model]
        for parent in self.parents:
            res = parent._meta.get_base_chain(model)
            if res:
                res.insert(0, parent)
                return res
        return []

    def get_parent_list(self):
        """
        Return all the ancestors of this model as a list ordered by MRO.
        Useful for determining if something is an ancestor, regardless of lineage.
        """
        result = OrderedSet(self.parents)
        for parent in self.parents:
            for ancestor in parent._meta.get_parent_list():
                result.add(ancestor)
        return list(result)

    def get_ancestor_link(self, ancestor):
        """
        Return the field on the current model which points to the given
        "ancestor". This is possible an indirect link (a pointer to a parent
        model, which points, eventually, to the ancestor). Used when
        constructing table joins for model inheritance.

        Return None if the model isn't an ancestor of this one.
        """
        if ancestor in self.parents:
            return self.parents[ancestor]
        for parent in self.parents:
            # Tries to get a link field from the immediate parent
            parent_link = parent._meta.get_ancestor_link(ancestor)
            if parent_link:
                # In case of a proxied model, the first link
                # of the chain to the ancestor is that parent
                # links
                return self.parents[parent] or parent_link

    def get_path_to_parent(self, parent):
        """
        Return a list of PathInfos containing the path from the current
        model to the parent model, or an empty list if parent is not a
        parent of the current model.
        """
        if self.model is parent:
            return []
        # Skip the chain of proxy to the concrete proxied model.
        proxied_model = self.concrete_model
        path = []
        opts = self
        for int_model in self.get_base_chain(parent):
            if int_model is proxied_model:
                opts = int_model._meta
            else:
                final_field = opts.parents[int_model]
                targets = (final_field.remote_field.get_related_field(),)
                opts = int_model._meta
                path.append(PathInfo(
                    from_opts=final_field.model._meta,
                    to_opts=opts,
                    target_fields=targets,
                    join_field=final_field,
                    m2m=False,
                    direct=True,
                    filtered_relation=None,
                ))
        return path

    def get_path_from_parent(self, parent):
        """
        Return a list of PathInfos containing the path from the parent
        model to the current model, or an empty list if parent is not a
        parent of the current model.
        """
        if self.model is parent:
            return []
        model = self.concrete_model
        # Get a reversed base chain including both the current and parent
        # models.
        chain = model._meta.get_base_chain(parent)
        chain.reverse()
        chain.append(model)
        # Construct a list of the PathInfos between models in chain.
        path = []
        for i, ancestor in enumerate(chain[:-1]):
            child = chain[i + 1]
            link = child._meta.get_ancestor_link(ancestor)
            path.extend(link.get_reverse_path_info())
        return path

    def _populate_directed_relation_graph(self):
        """
        This method is used by each model to find its reverse objects. As this
        method is very expensive and is accessed frequently (it looks up every
        field in a model, in every app), it is computed on first access and then
        is set as a property on every model.
        """
        related_objects_graph = defaultdict(list)

        all_models = self.apps.models.values()
        for model in all_models:
            opts = model._meta
            # Abstract model's fields are copied to child models, hence we will
            # see the fields from the child models.
            if opts.abstract:
                continue

            fields_with_relations = (
                f for f in opts._get_fields(reverse=False, include_parents=False)
                if f.is_relation and f.related_model is not None
            )
            for f in fields_with_relations:
                if not isinstance(f.remote_field.model, str):
                    related_objects_graph[f.remote_field.model._meta.concrete_model._meta].append(f)

        for model in all_models:
            # Set the relation_tree using the internal __dict__. In this way
            # we avoid calling the cached property. In attribute lookup,
            # __dict__ takes precedence over a data descriptor (such as
            # @cached_property). This means that the _meta._relation_tree is
            # only called if related_objects is not in __dict__.
            related_objects = related_objects_graph[model._meta.concrete_model._meta]
            model._meta.__dict__['_relation_tree'] = related_objects
        # It seems it is possible that self is not in all_models, so guard
        # against that with default for get().
        return self.__dict__.get('_relation_tree', EMPTY_RELATION_TREE)

    @cached_property
    def _relation_tree(self):
        return self._populate_directed_relation_graph()

    def _expire_cache(self, forward=True, reverse=True):
        # This method is usually called by apps.cache_clear(), when the
        # registry is finalized, or when a new field is added.
        if forward:
            for cache_key in self.FORWARD_PROPERTIES:
                if cache_key in self.__dict__:
                    delattr(self, cache_key)
        if reverse and not self.abstract:
            for cache_key in self.REVERSE_PROPERTIES:
                if cache_key in self.__dict__:
                    delattr(self, cache_key)
        self._get_fields_cache = {}

    def get_fields(self, include_parents=True, include_hidden=False):
        """
        Return a list of fields associated to the model. By default, include
        forward and reverse fields, fields derived from inheritance, but not
        hidden fields. The returned fields can be changed using the parameters:

        - include_parents: include fields derived from inheritance
        - include_hidden:  include fields that have a related_name that
                           starts with a "+"
        """
        if include_parents is False:
            include_parents = PROXY_PARENTS
        return self._get_fields(include_parents=include_parents, include_hidden=include_hidden)

    def _get_fields(self, forward=True, reverse=True, include_parents=True, include_hidden=False,
                    seen_models=None):
        """
        Internal helper function to return fields of the model.
        * If forward=True, then fields defined on this model are returned.
        * If reverse=True, then relations pointing to this model are returned.
        * If include_hidden=True, then fields with is_hidden=True are returned.
        * The include_parents argument toggles if fields from parent models
          should be included. It has three values: True, False, and
          PROXY_PARENTS. When set to PROXY_PARENTS, the call will return all
          fields defined for the current model or any of its parents in the
          parent chain to the model's concrete model.
        """
        if include_parents not in (True, False, PROXY_PARENTS):
            raise TypeError("Invalid argument for include_parents: %s" % (include_parents,))
        # This helper function is used to allow recursion in ``get_fields()``
        # implementation and to provide a fast way for Orun's internals to
        # access specific subsets of fields.

        # We must keep track of which models we have already seen. Otherwise we
        # could include the same field multiple times from different models.
        topmost_call = seen_models is None
        if topmost_call:
            seen_models = set()
        seen_models.add(self.model)

        # Creates a cache key composed of all arguments
        cache_key = (forward, reverse, include_parents, include_hidden, topmost_call)

        try:
            # In order to avoid list manipulation. Always return a shallow copy
            # of the results.
            return self._get_fields_cache[cache_key]
        except KeyError:
            pass

        fields = []
        # Recursively call _get_fields() on each parent, with the same
        # options provided in this call.
        if include_parents is not False:
            for parent in self.parents:
                # In diamond inheritance it is possible that we see the same
                # model from two different routes. In that case, avoid adding
                # fields from the same parent again.
                if parent in seen_models:
                    continue
                if (parent._meta.concrete_model != self.concrete_model and
                        include_parents == PROXY_PARENTS):
                    continue
                for obj in parent._meta._get_fields(
                        forward=forward, reverse=reverse, include_parents=include_parents,
                        include_hidden=include_hidden, seen_models=seen_models):
                    if not getattr(obj, 'parent_link', False) or obj.model == self.concrete_model:
                        fields.append(obj)
        if reverse:
            # Tree is computed once and cached until the app cache is expired.
            # It is composed of a list of fields pointing to the current model
            # from other models.
            all_fields = self._relation_tree
            for field in all_fields:
                # If hidden fields should be included or the relation is not
                # intentionally hidden, add to the fields dict.
                if include_hidden or not field.remote_field.hidden:
                    fields.append(field.remote_field)

        if forward:
            fields += self.local_fields
            # fields += self.local_many_to_many
            # Private fields are recopied to each child model, and they get a
            # different model as field.model in each child. Hence we have to
            # add the private fields separately from the topmost call. If we
            # did this recursively similar to local_fields, we would get field
            # instances with field.model != self.model.
            # if topmost_call:
            #     fields += self.private_fields

        # In order to avoid list manipulation. Always
        # return a shallow copy of the results
        fields = make_immutable_fields_list("get_fields()", fields)

        # Store result into cache for later access
        self._get_fields_cache[cache_key] = fields
        return fields

    @cached_property
    def _property_names(self):
        """Return a set of the names of the properties defined on the model."""
        names = []
        for name in dir(self.model):
            attr = inspect.getattr_static(self.model, name)
            if isinstance(attr, property):
                names.append(name)
        return frozenset(names)

    def notify_field_change(self, instance, field):
        for evt in self.fields_events[field]:
            evt(instance)

    @cached_property
    def db_returning_fields(self):
        """
        Private API intended only to be used by Orun itself.
        Fields to be returned after a database insert.
        """
        return [
            field for field in self._get_fields(forward=True, reverse=False, include_parents=PROXY_PARENTS)
            if getattr(field, 'db_returning', False)
        ]

    @cached_property
    def total_unique_constraints(self):
        """
        Return a list of total unique constraints. Useful for determining set
        of fields guaranteed to be unique for all rows.
        """
        return [
            constraint
            for constraint in self.constraints
            if isinstance(constraint, UniqueConstraint) and constraint.condition is None
        ]

    def _format_names_with_class(self, cls, objs):
        """App label/class name interpolation for object names."""
        new_objs = []
        for obj in objs:
            obj = obj.clone()
            obj.name = obj.name % {
                'app_label': self.schema,
                'class': self.model_name,
                'model_name': self.name,
            }
            new_objs.append(obj)
        return new_objs

    # DDL definition
    def add_trigger(self, trigger):
        self._triggers.append(trigger)

    _triggers = None
    @property
    def triggers(self):
        from orun.db.vsql.triggers import Triggers
        if self._triggers is None:
            self._triggers = Triggers()
        return self._triggers

    # auto calculable triggers
    def add_field_aggregation(self, field: Field):
        """Add auto calculable trigger for the target field"""
        self.auto_calc_triggers.append(field)

    _auto_calc_triggers = None
    @property
    def auto_calc_triggers(self):
        if self._auto_calc_triggers is None:
            self._auto_calc_triggers = []
        return self._auto_calc_triggers

    def field_by_column(self, col: str) -> Field:
        for f in self.fields:
            if f.column == col:
                return f


class ModelHelper:
    pass


def method_helper(fn, class_helper):
    @wraps(fn)
    def wrapped(self, *args, **kwargs):
        return fn(self, class_helper, *args, **kwargs)
    return wrapped


def classmethod_helper(fn, class_helper):
    def wrapped(cls, *args, **kwargs):
        return fn.__func__(cls, class_helper, *args, **kwargs)
    if getattr(fn, 'exposed', None):
        wrapped.exposed = fn.exposed
    if getattr(fn, 'pass_request', None):
        wrapped.pass_request = fn.pass_request
    return classmethod(wrapped)
