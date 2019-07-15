from collections import defaultdict
import warnings
from functools import partial
import sqlalchemy as sa
from sqlalchemy.orm import mapper, relationship, deferred, backref, synonym

from orun import app
from orun.apps import AppConfig
from orun.db import connection, connections
from orun.utils.text import camel_case_to_spaces, format_lazy
from orun.db.models.fields import Field, BigAutoField

DEFAULT_NAMES = ('unique_together', 'index_together', 'fixtures')


class Options:
    abstract = False
    db_table: str = None
    db_schema: str = None
    db_tablespace: str = None
    name: str = None
    extension = None
    extending = None
    app_config: AppConfig = None
    app_label = None
    model = None
    inherited = None
    object_name = None
    model_name = None
    pk: Field = None
    apps = None
    table: sa.Table = None
    mapped = None
    ordering = None
    managed = True
    verbose_name = None
    verbose_name_plural = None
    auto_created = False
    one_to_one = False
    field_change_event = None
    title_field = None
    status_field = None
    field_groups = None
    log_changes = True

    def __init_subclass__(cls, **kwargs):
        from orun.db.models.base import Model

        cls.parents = {}

        if not cls.abstract:
            if cls.app_label is None:
                cls.app_label = cls.model.__module__.split('.', 1)[0]
            if cls.object_name is None:
                cls.object_name = cls.model.__name__
            if cls.model_name is None:
                cls.model_name = cls.object_name.lower()
            if cls.name is None and not cls.abstract:
                cls.name = f'{cls.app_label}.{cls.model_name}'
            elif cls.extension is None:
                for base in cls.__bases__:
                    if issubclass(base, Options) and base is not Options:
                        if base.name == cls.name:
                            cls.extending = base.model
                            cls.extension = True
                            break
                        else:
                            cls.inherited = True
                if not cls.extension:
                    cls.extension = False

            if issubclass(cls.model, Model) and cls.db_table is None:
                cls.db_table = cls.name.replace('.', '_')
                if cls.db_schema is None and cls.app_config:
                    cls.db_schema = cls.app_config.db_schema or ''
                if cls.db_schema and cls.name.startswith(cls.db_schema + '.'):
                    cls.db_table = cls.name.split('.', 1)[-1].replace('.', '_')

            if cls.inherited is None:
                cls.inherited = cls.extension or bool(cls.parents)
            cls.concrete = bool(cls.db_table)

    @classmethod
    def _get_name(cls):
        return f'{cls.app_config.label}.{cls.model.__name__.lower()}'

    @classmethod
    def from_model(cls, meta, model, parents=None, attrs=None):
        meta_attrs = {}
        if attrs:
            meta_attrs.update(attrs)
        if meta is not None:
            meta_attrs.update(meta.__dict__)

        if not parents:
            bases = [base.Meta for base in model.__bases__ if hasattr(base, 'Meta') and base.Meta]
        else:
            bases = [base.Meta for base in parents if hasattr(base, 'Meta') and base.Meta]
        if bases:
            bases = tuple(bases)
        else:
            bases = (Options,)

        meta_attrs.setdefault('abstract', False)
        meta_attrs.setdefault('extension', None)
        meta_attrs.setdefault('db_table', None)
        meta_attrs.setdefault('bases', parents)
        meta_attrs.setdefault('inherited', bool(parents))
        meta_attrs['model'] = model

        opts = type('Meta', bases, meta_attrs)
        return opts

    def __init__(self, base_model=None, app=None):
        self.app = app
        self.base_model = base_model
        self.parents = {}
        self.local_fields = []
        self.fields = Fields(self)
        self.pk = None
        self.field_change_event = defaultdict(list)

    @property
    def connection(self):
        return self.app.connection

    def __str__(self):
        return self.name or (self.model.app_label + '.' + self.object_name)

    def contribute_to_class(self, cls, name):
        cls._meta = self
        self.model = cls

        if self.verbose_name is None:
            self.verbose_name = camel_case_to_spaces(self.object_name)

        if self.verbose_name_plural is None:
            self.verbose_name_plural = format_lazy('{}s', self.verbose_name)

    def add_field(self, field):
        if self.title_field is None and field.name == 'name':
            self.__class__.title_field = field.name
        elif self.status_field is None and field.name == 'status':
            self.__class__.status_field = field.name

        self.fields.append(field)
        if self.pk is None and field.primary_key and field in self.local_fields:
            self.pk = field

    def _expire_cache(self):
        pass

    def build_table(self, meta):
        if self.abstract or self.table is not None:
            return

        # Build the table
        args = []
        kwargs = {}
        for f in self.concrete_fields:
            if f.column is not None:
                args.append(f.column)
        # if self.db_schema and self.app is not None and self.connection.features.supports_schema:
        if self.db_schema and self.app is not None:
            kwargs['schema'] = self.db_schema
        self.table = sa.Table(self.db_table, meta, *args, **kwargs)
        self.table.__model__ = self.model
        self.table_name = str(self.table)
        return self.table

    def _build_mapper(self):
        if self.abstract or self.mapped is not None:
            return

        # Build the orm mapper
        props = {}
        for f in self.local_fields:
            if f.name != f.db_column and f.column is not None and not f.column.foreign_keys:
                props[f.name] = f.column
            if not f.primary_key:
                if f.many_to_many:
                    props[f.name] = relationship(
                        lambda f=f: f.rel.model,
                        secondary=f.rel.through._meta.table,
                        secondaryjoin=f.rel.secondaryjoin(),
                        primaryjoin=f.rel.primaryjoin()
                    )
                elif f.one_to_many:
                    if callable(f.primary_join):
                        primary_join = f.primary_join(f.model, f.rel.model)
                        kwargs = {'primaryjoin': primary_join}
                    else:
                        kwargs = {'foreign_keys': [f.rel.remote_field.column]}
                    if f.lazy:
                        kwargs['lazy'] = f.lazy
                    props[f.name] = relationship(lambda f=f: f.rel.model, **kwargs)
                elif f.column is not None:
                    for fk in f.column.foreign_keys:
                        kwargs = {}
                        if f.lazy:
                            kwargs['lazy'] = f.lazy
                        if f.related_name and f.related_name != '+':
                            kwargs['backref'] = backref(f.related_name, lazy='dynamic')
                        kwargs['remote_side'] = fk.column
                        def resolve_relationship(model, f, fk):
                            return fk.column.table.__model__._meta.mapped
                        prop_name = f"_{f.name}__fk"
                        prop = props[prop_name] = relationship(
                            partial(resolve_relationship, f.model, f, fk),
                            foreign_keys=[f.column],
                            **kwargs
                        )
                        f.rel.prop_name = prop_name
                        props[f.name] = synonym(prop_name, descriptor=ForeignKeyDescriptor(prop_name, f, prop))
                    if f.deferred:
                        props[f.name] = deferred(f.column)
                elif f.related:
                    props[f.name] = f.related
                elif f.descriptor:
                    descriptor = f.descriptor
                    if isinstance(descriptor, list):
                        if len(descriptor) == 1:
                            descriptor.append(lambda self, v, field=f: warnings.warn('Read-only field "%s" cannot be modified!' % field.name))
                        descriptor = property(
                            *(ignore_error_decorator(getattr(f.model, attr) if isinstance(attr, str) else attr) for attr in descriptor)
                        )
                    props[f.name] = synonym(f.name, descriptor=descriptor)

        props['pk'] = synonym(self.pk.attname)

        table = self.table
        mapped = self.model

        additional_args = {}

        if self.ordering:
            additional_args['order_by'] = normalize_ordering(self, self.ordering)
        elif not self.parents:
            additional_args['order_by'] = normalize_ordering(self, 'pk')

        if self.parents:
            for parent, field in self.parents.items():
                parent = self.app.models[parent.Meta.name]
                if parent._meta.mapped is None:
                    parent._meta._build_mapper()
                col = self.fields[field.name].column
                mapped.c = mapper(
                    mapped, table, inherits=parent, properties=props,
                    inherit_condition=col == list(col.foreign_keys)[0].column, **additional_args
                ).c
        else:
            mapped.c = mapper(mapped, table, properties=props, **additional_args).c
            mapped.c.pk = self.pk.column

        self.mapped = mapped

    def _build_model(self, registry):
        from orun.db.models import Model
        name = self.name

        parents = self.bases
        bases = [self.model]
        model = self.model
        #for parent in parents:
        #    parent_class = registry[parent._meta.name]
        #    bases += parent_class._meta.bases
        #    model = type(self.object_name, (model, parent_class), {'__register__': False})

        #bases += [Model if base is Model else (base._meta.name in registry and registry[base._meta.name]) or base for base in model.mro() if issubclass(base, Model) and base is not model]
        bases += [Model if base is Model else (base._meta.name in registry and registry.models[base._meta.name]) or base for base in model._meta.bases if issubclass(base, Model) and base is not model]
        cls = type(self.object_name, tuple(bases), {'__app__': registry, '__model__': model, '__module__': self.app_label})
        return cls

    @property
    def concrete_fields(self):
        fields = self.local_fields
        for f in fields:
            if f.concrete:
                yield f

    @property
    def deferred_fields(self):
        return [f for f in self.fields if f.deferred]

    @property
    def fields_dict(self):
        return self.fields

    @property
    def editable_fields(self):
        return [f for f in self.fields if f.editable]

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
        return [f for f in self.concrete_fields if f.copy]

    @property
    def auto_report_fields(self):
        if self.field_groups and 'auto_report' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['auto_report']]
        else:
            return self.list_fields

    def __getitem__(self, item):
        return self.fields[item]

    def get_field(self, field):
        return self.fields[field]

    def can_migrate(self, connection):
        """
        Return True if the model can/should be migrated on the `connection`.
        `connection` can be either a real connection or a connection alias.
        """
        if not self.managed:
            return False
        if isinstance(connection, str):
            connection = connections[connection]
        if self.required_db_vendor:
            return self.required_db_vendor == connection.vendor
        # if self.required_db_features:
        #     return all(getattr(connection.features, feat, False)
        #                for feat in self.required_db_features)
        return True

    def get_title_field(self):
        return self.fields[self.title_field]

    def get_name_fields(self):
        if self.field_groups and 'name_fields' in self.field_groups:
            return [self.fields[field_name] for field_name in self.field_groups['name_fields']]
        return [self.fields[self.title_field]]

    @property
    def related_objects(self):
        """
        Return all related objects pointing to the current model. The related
        objects can come from a one-to-one, one-to-many, or many-to-many field
        relation type.

        Private API intended only to be used by Django itself; get_fields()
        combined with filtering of field properties is the public API for
        obtaining this field list.
        """
        return ()
        return (
            "related_objects",
            tuple()
            # (obj for obj in self.local_fields if not obj.hidden or obj.field.many_to_many)
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
        first_element = next(iter(option_together))
        if not isinstance(first_element, (tuple, list)):
            option_together = (option_together,)
        # Normalize everything to tuples
        return tuple(tuple(ot) for ot in option_together)
    except TypeError:
        # If the value of option_together isn't valid, return it
        # verbatim; this will be picked up by the check framework later.
        return option_together


def normalize_ordering(opts, ordering):
    if not isinstance(ordering, (list, tuple)):
        ordering = [ordering]
    r = []
    for o in ordering:
        desc = False
        if o[0] == '-':
            desc = True
            o = o[1:]
        if o == 'pk':
            o = opts.pk.column
        else:
            o = opts.fields_dict[o].column
        if desc:
            o = o.desc()
        r.append(o)
    return r


def ignore_error_decorator(fn):
    def ignored(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            raise
            warnings.warn('Error calculating field property: %s' % str(e))
    return ignored


from orun.db.models.fields import Fields
from orun.db.models.fields.related_descriptors import ForeignKeyDescriptor
