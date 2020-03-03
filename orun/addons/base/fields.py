from orun import apps
from orun.core.exceptions import FieldDoesNotExist, ObjectDoesNotExist
from orun.db.models.fields import BaseField
from orun.db import DEFAULT_DB_ALIAS, models #, router, transaction
from orun.db.models import DO_NOTHING
from orun.db.models.base import ModelBase #, make_foreign_order_accessors
from orun.db.models import OneToManyField, ForeignKey

from .models import Model


class GenericForeignKey(BaseField):
    """
    Provide a generic many-to-one relation through the ``content_type`` and
    ``object_id`` fields.

    This class also doubles as an accessor to the related object (similar to
    ForwardManyToOneDescriptor) by adding itself as a model attribute.
    """

    # Field flags
    auto_created = False
    concrete = False
    editable = False
    hidden = False

    is_relation = True
    many_to_many = False
    many_to_one = True
    one_to_many = False
    one_to_one = False
    related_model = None
    remote_field = None
    db_column = None
    primary_key = False
    related = None
    descriptor = None

    def __init__(self, ct_field='model', fk_field='object_id', for_concrete_model=True):
        self.ct_field = ct_field
        self.fk_field = fk_field
        self.for_concrete_model = for_concrete_model
        self.editable = False
        self.rel = None
        self.column = None

    def contribute_to_class(self, cls, name, **kwargs):
        self.name = name
        self.model = cls
        self.cache_attr = "_%s_cache" % name
        # cls._meta.add_field(self, private=True)
        if cls._meta.apps:
            setattr(cls, name, self)

    def get_filter_kwargs_for_object(self, obj):
        """See corresponding method on Field"""
        return [
            self.model.c[self.fk_field] == getattr(obj, self.fk_field),
            self.model.c[self.ct_field] == getattr(obj, self.ct_field),
        ]

    def get_forward_related_filter(self, obj):
        """See corresponding method on RelatedField"""
        return [
            self.model.c[self.fk_field] == obj.pk,
            self.model.c[self.ct_field] == Model.objects.get_for_model(obj).pk,
        ]

    def __str__(self):
        model = self.model
        app = model._meta.app_label
        return '%s.%s.%s' % (app, model._meta.object_name, self.name)

    def get_content_type(self, obj=None, id=None):
        Model = self.model._meta.app['ir.model']
        if obj is not None:
            return Model.get_for_model(obj)
        elif id is not None:
            return Model.get_for_id(id)
        else:
            # This should never happen. I love comments like this, don't you?
            raise Exception("Impossible arguments to GFK.get_content_type!")

    def is_cached(self, instance):
        return hasattr(instance, self.cache_attr)

    def __get__(self, instance, cls=None):
        if instance is None:
            return self

        # Don't use getattr(instance, self.ct_field) here because that might
        # reload the same Model over and over (#5570). Instead, get the
        # content type ID here, and later when the actual instance is needed,
        # use Model.objects.get_for_id(), which has a global cache.
        f = self.model._meta.fields_dict[self.ct_field]
        ct_id = getattr(instance, f.get_attname(), None)
        pk_val = getattr(instance, self.fk_field)

        try:
            rel_obj = getattr(instance, self.cache_attr)
        except AttributeError:
            rel_obj = None
        else:
            pass
            # if rel_obj and (ct_id != self.get_content_type(obj=rel_obj).id or
            #                 rel_obj._meta.pk.to_python(pk_val) != rel_obj._get_pk_val()):
            #     rel_obj = None

        if rel_obj is not None:
            return rel_obj

        if ct_id is not None:
            if isinstance(f, ForeignKey):
                ct = self.get_content_type(id=ct_id)
                try:
                    rel_obj = ct.get_object_for_this_type(pk_val)
                except ObjectDoesNotExist:
                    pass
            else:
                rel_obj = app[ct_id].objects.get(pk_val)
        setattr(instance, self.cache_attr, rel_obj)
        return rel_obj

    def __set__(self, instance, value):
        ct = None
        fk = None
        if value is not None:
            ct = self.get_content_type(obj=value)
            fk = value._get_pk_val()

        setattr(instance, self.ct_field, ct)
        setattr(instance, self.fk_field, fk)
        setattr(instance, self.cache_attr, value)

    def _invalidate_cache(self):
        pass


class GenericOneToManyField(OneToManyField):
    def __init__(self, to, ct_field='model', to_field='object_id', lazy='dynamic', primary_join=None, *args, **kwargs):
        if primary_join is None:
            primary_join = lambda model, fk_model: and_(
                model._meta.pk.column == foreign(fk_model._meta.fields[to_field].column),
                fk_model._meta.fields_dict[ct_field].column == model._meta.name
            )
        super(GenericOneToManyField, self).__init__(to, to_field, lazy=lazy, primary_join=primary_join, *args, **kwargs)
