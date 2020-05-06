import copy
from typing import List
import inspect
from collections import defaultdict

from orun.apps import apps
from orun.conf import settings
from orun.core.exceptions import FieldDoesNotExist, ImproperlyConfigured
from orun.db import connections, connection
from orun.db.models import Manager
from orun.db.models.fields import AutoField, CharField
from orun.db.models.fields.proxy import OrderWrt
from orun.db.models.query_utils import PathInfo
from orun.utils.datastructures import ImmutableList, OrderedSet
from orun.utils.functional import cached_property
from orun.utils.text import camel_case_to_spaces, format_lazy
from orun.utils.translation import override

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
            option_together = (option_together,)
        # Normalize everything to tuples
        return tuple(tuple(ot) for ot in option_together)
    except TypeError:
        # If the value of option_together isn't valid, return it
        # verbatim; this will be picked up by the check framework later.
        return option_together


def make_immutable_fields_list(name, data):
    return ImmutableList(data, warning=IMMUTABLE_WARNING % name)


class Options:
    default_apps = apps

    abstract = False
    proxy = False
    swapped = False
    db_table: str = None
    db_schema: str = None
    db_tablespace: str = None
    tablename: str = None
    name: str = None
    override = False
    addon = None
    schema = None
    model = None
    inherited = False
    inherits = None
    object_name: str = None
    model_name: str = None
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
    title_field = None
    status_field = None
    sequence_field: str = None
    active_field: str = None
    field_groups = None
    log_changes = True
    select_on_save = False
    default_permissions = ('create', 'read', 'update', 'delete')
    permissions = ()

    #
    local_many_to_many: List['Field'] = None

    FORWARD_PROPERTIES = {
        'many_to_many', 'concrete_fields', 'local_concrete_fields',
        '_forward_fields_map', 'managers', 'managers_map', 'base_manager',
        'default_manager',
    }
    REVERSE_PROPERTIES = {'related_objects', 'fields_map', '_relation_tree'}

    def __init__(self, base_model=None, apps=None):
        self.base_model = base_model
        self.apps = apps
        self.parents = {}
        self._get_fields_cache = {}
        if not self.field_change_event:
            self.__class__.field_change_event = self.field_change_event = defaultdict(list)
        self.local_fields = []
        self.fields: List[Field] = Fields(self)
        self.local_managers = []
        self.base_manager_name = None
        self.default_manager_name = None
        self.model_name = None
        self._ordering_clash = False
        self.indexes = []
        self.constraints = []
        self.unique_together = []
        self.index_together = []
        self.get_latest_by = None
        # self.order_with_respect_to = None
        self.db_tablespace = settings.DEFAULT_TABLESPACE
        self.required_db_features = []
        self.required_db_vendor = None
        self.auto_field = None
        self.abstract = False
        self.concrete_model = None
        # For any class that is a proxy (including automatically created
        # classes for deferred object loading), proxy_for_model tells us
        # which class this model is proxying. Note that proxy_for_model
        # can create a chain of proxy models. For non-proxy models, the
        # variable is always None.

    def __init_subclass__(cls, **kwargs):
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
                    cls.qualname = '{}.{}'.format(cls.db_schema, cls.tablename)
                    cls.db_table = '"{}"."{}"'.format(cls.db_schema, cls.tablename)
            else:
                cls.qualname = cls.tablename = cls.db_table

            if cls.inherited is None:
                cls.inherited = cls.extension or bool(cls.parents)
            cls.concrete = bool(cls.db_table)

    @classmethod
    def from_model(cls, meta, model, parents=None, attrs=None):
        is_proxy = False
        meta_attrs = {}
        if attrs:
            meta_attrs.update(attrs)
        if meta is not None:
            meta_attrs.update({k: v for k, v in meta.__dict__.items() if not k.startswith('__')})
            # if proxy, generate a new model name
            is_proxy = meta_attrs.get('proxy')

        if not parents:
            bases = [base.Meta for base in model.__bases__ if hasattr(base, 'Meta') and base.Meta]
        else:
            bases = [base.Meta for base in parents if hasattr(base, 'Meta') and base.Meta]
        if bases:
            bases = tuple(bases)
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
        for parent in parents:
            if not parent.Meta.abstract:
                meta_attrs.setdefault('inherits', parent)
                break
        meta_attrs['model'] = model

        opts = type('Options', bases, meta_attrs)
        opts.overrides = []
        return opts

    def contribute_to_class(self, cls, name):
        from orun.db import connection
        from orun.db.backends.utils import truncate_name

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
            if not any(isinstance(field, OrderWrt) for field in model._meta.local_fields):
                f = OrderWrt()
                model.add_to_class('_order', f)
                self.local_fields.append(f)
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
                auto = AutoField(verbose_name='ID', primary_key=True, auto_created=True)
                model.add_to_class('id', auto)

    def add_manager(self, manager):
        self.local_managers.append(manager)
        self._expire_cache()

    def add_field(self, field):
        # if field.is_relation and field.many_to_many:
        #     self.local_many_to_many.append(field)

        # Special field names
        if self.title_field is None and field.name == 'name':
            self.__class__.title_field = field.name
        elif self.status_field is None and field.name == 'status':
            self.__class__.status_field = field.name
        elif self.sequence_field is None and field.name == 'sequence':
            self.__class__.sequence_field = field.name
        elif self.active_field is None and field.name == 'active':
            self.__class__.active_field = field.name

        self.fields.append(field)
        if self.pk is None and field.primary_key and field in self.local_fields:
            self.pk = field

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
        if self.proxy or self.swapped or not self.managed:
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

    def get_title_field(self):
        return self.fields[self.title_field]

    def get_name_fields(self):
        if self.field_groups and 'name_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['name_fields']]
        return [self.fields[self.title_field]]

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

        Private API intended only to be used by Orun itself; get_fields()
        combined with filtering of field properties is the public API for
        obtaining this field list.
        """
        return make_immutable_fields_list(
            "concrete_fields", (f for f in self.fields if f.concrete and not f.many_to_many)
        )

    @cached_property
    def local_concrete_fields(self):
        """
        Return a list of all concrete fields on the model.

        Private API intended only to be used by Orun itself; get_fields()
        combined with filtering of field properties is the public API for
        obtaining this field list.
        """
        return make_immutable_fields_list(
            "local_concrete_fields", (f for f in self.local_fields if f.concrete and not f.many_to_many)
        )

    @cached_property
    def deferred_fields(self):
        return make_immutable_fields_list(
            "deferred_fields", (f.name for f in self.local_fields if f.defer)
        )

    @property
    def editable_fields(self):
        return [f for f in self.fields if f.editable]

    @property
    def list_fields(self):
        if self.field_groups and 'list_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['list_fields']]
        else:
            return [f for f in self.editable_fields if not f.one_to_many]

    @property
    def form_fields(self):
        if self.field_groups and 'form_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['form_fields']]
        else:
            return self.editable_fields

    @property
    def copyable_fields(self):
        return [f for f in self.fields if f.copy]

    @property
    def searchable_fields(self):
        if self.field_groups and 'searchable_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['searchable_fields']]
        elif self.title_field:
            return [self.get_title_field()]
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

            for f in opts._get_fields(reverse=False, include_parents=False):
                if not hasattr(f, 'model'):
                    print('field not found')
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


from orun.db.models.fields import Fields, Field
