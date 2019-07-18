from functools import partial
import sqlalchemy as sa
from sqlalchemy.orm import load_only

# from orun.utils.translation import gettext_lazy as _
from orun.db.models.fields.mixins import FieldCacheMixin
from orun.db.models.fields import Field
from orun.db.models.utils import make_model_tuple
from orun.db.models.fields.reverse_related import ManyToOneRel, ManyToManyRel, OneToManyRel


CASCADE = 'CASCADE'
SET_NULL = 'SET NULL'
RECURSIVE_RELATIONSHIP_CONSTANT = 'self'


def lazy_related_operation(function, model, *args, **kwargs):
    model._meta.app._pending_operations.append(partial(function, model, *args, **kwargs))


def resolve_relation(scope_model, relation):
    """
    Transform relation into a model or fully-qualified model string of the form
    "app_label.ModelName", relative to scope_model.

    The relation argument can be:
      * RECURSIVE_RELATIONSHIP_CONSTANT, i.e. the string "self", in which case
        the model argument will be returned.
      * A bare model name without an app_label, in which case scope_model's
        app_label will be prepended.
      * An "app_label.ModelName" string.
      * A model class, which will be returned unchanged.
    """
    # Check for recursive relations
    if relation == RECURSIVE_RELATIONSHIP_CONSTANT:
        relation = scope_model

    # Look for an "app.Model" relation
    if isinstance(relation, str):
        if "." not in relation:
            relation = "%s.%s" % (scope_model.Meta.app_label, relation)
    else:
        return relation.Meta.name

    return relation


def create_many_to_many_intermediary_model(field, klass):
    from orun.db import models

    def set_managed(model, related, through):
        if isinstance(related, str):
            related = model._meta.app.get_model(related)
        through = model._meta.app.get_model(through)
        through._meta.managed = model._meta.managed or related._meta.managed


    model_name = field.model._meta.name + '.' + field.name + '.rel'
    to_model = resolve_relation(klass, field.rel.model)
    lazy_related_operation(set_managed, klass, to_model, model_name)

    to = 'to_%s' % make_model_tuple(to_model).replace('.', '_')
    from_ = 'from_%s' % klass._meta.name.replace('.', '_')

    meta = type('Meta', (), {
        # 'db_table': field._get_m2m_db_table(klass._meta),
        'auto_created': klass,
        'app_label': klass._meta.app_label,
        # 'db_tablespace': klass._meta.db_tablespace,
        'unique_together': (from_, to),
        # 'verbose_name': _('%(from)s-%(to)s relationship') % {'from': from_, 'to': to},
        # 'verbose_name_plural': _('%(from)s-%(to)s relationships') % {'from': from_, 'to': to},
        'name': field.model._meta.name + '.' + field.name + '.rel',
        'log_changes': False,
    })
    # Construct and return the new class.
    from_field = ForeignKey(
            klass,
            # db_tablespace=field.db_tablespace,
            # db_constraint=field.remote_field.db_constraint,
            on_delete=CASCADE,
        )
    to_field = ForeignKey(
            to_model,
            # db_tablespace=field.db_tablespace,
            # db_constraint=field.remote_field.db_constraint,
            on_delete=CASCADE,
        )
    new_class = type(model_name, (models.Model,), {
        'Meta': meta,
        '__module__': klass.__module__,
        from_: from_field,
        to: to_field,
    })

    model = new_class.__build__(klass._meta.app)
    # field.rel.primaryjoin = partial(lambda field: field.column == field.rel.model._meta.pk.column, from_field)
    # field.rel.secondaryjoin = partial(lambda field: field.column == field.rel.model.pk.column, to_field)
    field.rel.primaryjoin = partial(join, model, from_)
    field.rel.secondaryjoin = partial(join, model, to)
    return model


def join(model, field):
    field = model._meta.fields[field]
    return field.column == field.rel.model._meta.pk.column


class RelatedField(FieldCacheMixin, Field):
    rel_class = None
    db_type = None

    def __init__(self, on_delete=None, lazy=None, related_name=None, domain=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lazy = lazy
        self.domain = domain
        self.on_delete = on_delete
        self.related_name = related_name

    def contribute_to_class(self, cls, name):
        super().contribute_to_class(cls, name)

        if not cls._meta.abstract:
            def resolve_related_class(model, related, field):
                rel_model = related.model
                if rel_model == 'self':
                    rel_model = model.Meta.name
                field.rel.model = self.model._meta.app.get_model(rel_model)
                if field.one_to_many:
                    return lazy_related_operation(lambda model, field: field.rel.set_field_name(), model, field)
                else:
                    field.rel.set_field_name()
                if self.many_to_one and self.db_type is None:
                    lazy_related_operation(resolve_related_class, model, related, field)
                if field.column is None:
                    field.column = self.create_column()

            lazy_related_operation(resolve_related_class, cls, self.rel, field=self)

    def create_column(self, *args, **kwargs):
        if self.db_type is not None:
            return super().create_column(sa.ForeignKey(self.rel.model._meta.pk.column))

    def get_cache_name(self):
        return self.name


class ForeignKey(RelatedField):
    many_to_one = True
    rel_class = ManyToOneRel

    def __init__(
            self, to, to_fields=None, on_delete=CASCADE, on_update=None, db_constraint=True, name_fields=None,
            label_from_instance=None, *args, **kwargs
    ):
        self.db_constraint = db_constraint
        self.on_delete = on_delete
        self.on_update = on_update
        self.label_from_instance = label_from_instance
        self.name_fields = name_fields
        kwargs['rel'] = self.rel_class(self, to, to_fields)
        super().__init__(*args, **kwargs)

    def get_attname(self):
        return self.db_column or '%s_id' % self.name

    def _formfield(self):
        info = super()._formfield()
        info['domain'] = self.domain
        info['model'] = self.rel.model._meta.name
        return info

    def to_json(self, value):
        if value:
            return (value.pk, str(value))

    def _db_type(self, connection):
        return self.rel.remote_field.rel_db_type(connection=connection)

    def db_parameters(self, connection):
        return {"type": self._db_type(connection), "check": self.db_check(connection)}


class ManyToManyField(RelatedField):
    # Field flags
    many_to_many = True
    many_to_one = False
    one_to_many = False
    one_to_one = False

    rel_class = ManyToManyRel

    def __init__(self, to, through=None, through_fields=None, db_table=None, *args, **kwargs):
        kwargs['rel'] = self.rel_class(self, to, through=through, through_fields=through_fields)
        super().__init__(*args, **kwargs)
        self.db_table = db_table

    def get_attname(self):
        return None

    def contribute_to_class(self, cls, name):
        super().contribute_to_class(cls, name)

        if not cls._meta.abstract:
            if self.rel.through:
                def resolve_through_model(_, rel, field):
                    try:
                        model = field.model._meta.app.get_model(rel.through)
                        field.rel.through = model
                        rel.set_field_names()
                        rel.primaryjoin = partial(join, model, rel.from_field.name)
                        rel.secondaryjoin = partial(join, rel.through, rel.to_field.name)
                    except AttributeError:
                        lazy_related_operation(resolve_through_model, _, rel, field)
                lazy_related_operation(resolve_through_model, cls, self.rel, field=self)
            else:
                self.rel.through = create_many_to_many_intermediary_model(self, cls)

    def _formfield(self):
        info = super()._formfield()
        info['model'] = self.rel.model._meta.name
        return info


class OneToManyField(RelatedField):
    one_to_many = True
    nested_data = True
    rel_class = OneToManyRel

    def __init__(self, to, to_fields=None, primary_join=None, lazy='dynamic', *args, **kwargs):
        kwargs['rel'] = self.rel_class(self, to, to_fields)
        self.primary_join = primary_join
        super().__init__(lazy=lazy, *args, **kwargs)

    def contribute_to_class(self, cls, name):
        super().contribute_to_class(cls, name)

    def _formfield(self):
        r = super()._formfield()
        r['field'] = self.rel.field_name
        r['model'] = self.rel.model._meta.name
        return r

    def to_json(self, value):
        value = value.options(load_only(self.rel.model._meta.pk.column.name)).values(self.rel.model._meta.pk.column.name)
        return [obj[0] for obj in value]

    def set(self, instance, value):
        rel_model = self.rel.model._meta.app[self.rel.model]
        res = []
        field = getattr(instance, self.name)
        for v in value:
            values = v.get('values')
            action = v['action']
            if action == 'CREATE':
                values[self.rel.field_name] = instance.pk
                obj = rel_model.write(values)
                if instance.pk is None:
                    res.append(obj)
            elif action == 'DESTROY':
                rel_model.destroy([v['id']])
            elif action == 'UPDATE':
                rel_model.write(values)
        if res:
            setattr(instance, self.name, res)


class OneToOneField(ForeignKey):
    one_to_one = True


from orun.db import models
