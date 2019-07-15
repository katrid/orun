"""
A Python "serializer". Doesn't do much serializing per se -- just converts to
and from basic Python data types (lists, dicts, strings, etc.). Useful as a basis for
other serializers.
"""
from collections import OrderedDict
from sqlalchemy.orm import load_only

from orun import app
from orun.apps import apps
from orun.conf import settings
from orun.core.serializers import base
from orun.db import DEFAULT_DB_ALIAS, models, session
from orun.utils.encoding import force_text, is_protected_type


class Serializer(base.Serializer):
    """
    Serializes a QuerySet to basic Python objects.
    """

    internal_use_only = True

    def start_serialization(self):
        self._current = None
        self.objects = []

    def end_serialization(self):
        pass

    def start_object(self, obj):
        self._current = OrderedDict()

    def end_object(self, obj):
        self.objects.append(self.get_dump_object(obj))
        self._current = None

    def get_dump_object(self, obj):
        data = OrderedDict([('model', force_text(obj._meta))])
        if not self.use_natural_primary_keys or not hasattr(obj, 'natural_key'):
            data["pk"] = force_text(obj._get_pk_val(), strings_only=True)
        data['fields'] = self._current
        return data

    def handle_field(self, obj, field):
        value = field.value_from_object(obj)
        # Protected types (i.e., primitives like None, numbers, dates,
        # and Decimals) are passed through as is. All other values are
        # converted to string first.
        if is_protected_type(value):
            self._current[field.name] = value
        else:
            self._current[field.name] = field.value_to_string(obj)

    def handle_fk_field(self, obj, field):
        if self.use_natural_foreign_keys and hasattr(field.remote_field.model, 'natural_key'):
            related = getattr(obj, field.name)
            if related:
                value = related.natural_key()
            else:
                value = None
        else:
            value = getattr(obj, field.get_attname())
            if not is_protected_type(value):
                value = field.value_to_string(obj)
        self._current[field.name] = value

    def handle_m2m_field(self, obj, field):
        if field.remote_field.through._meta.auto_created:
            if self.use_natural_foreign_keys and hasattr(field.remote_field.model, 'natural_key'):
                def m2m_value(value):
                    return value.natural_key()
            else:
                def m2m_value(value):
                    return force_text(value._get_pk_val(), strings_only=True)
            self._current[field.name] = [
                m2m_value(related) for related in getattr(obj, field.name).iterator()
            ]

    def getvalue(self):
        return self.objects


def get_prep_value(model, field_name, field, value):
    if ':' in field_name:
        k, f = field_name.split(':')
        model_field = model._meta.fields_dict[k].rel.model
        obj = model_field.objects.filter({f: value}).options(load_only(model_field.pk)).first()
        assert obj, 'Value "{}" not found for "{}"'.format(value, field_name)
        return k, obj.pk
    elif field:
        value = field.to_python(value)
    return field_name, value


def Deserializer(object_list, **options):
    """
    Deserialize simple Python objects back into Orun ORM instances.

    It's expected that you pass the Python objects themselves (instead of a
    stream or a string) to the constructor
    """
    db = options.pop('using', DEFAULT_DB_ALIAS)
    ignore = options.pop('ignorenonexistent', False)
    val_names_cache = {}
    model_name = options.get('model')
    if isinstance(model_name, str):
        Model = app[model_name]
    else:
        Model = model_name
    Object = Model.env['ir.object']

    pk = xml_id = None

    for d in object_list:
        vals = d
        if xml_id is not False:
            vals = {}
            for k, v in d.items():
                # has a field identified
                field_name = k
                if ':' in k:
                    xml_id = True
                    if v not in val_names_cache:
                        field_name, f = k.split(':')
                        # the identified is a xml id
                        if f == 'id':
                            v = val_names_cache[v] = Object.get_object(v).object_id
                        else:
                            v = get_prep_value(Model, k, None, v)[1]
                    else:
                        v = val_names_cache[v]
                elif field_name == 'pk':
                    xml_id = True
                    field_name = Model._meta.pk.name
                vals[field_name] = v

            # Avoid to check by the xml id again
            xml_id = bool(xml_id)

        if pk is None:
            if 'pk' in d:
                pk = Model._meta.pk
            else:
                pk = False

        # Ignore if pk is present and object already exists
        if not pk or (pk and session.query(pk.column).filter(pk.column == d['pk']).scalar() is None):
            obj = Model()
            if 'id' in vals:
                obj.id = vals['id']
            yield Model.deserialize(obj, vals, force_insert=True)


def _get_model(model_identifier):
    """
    Helper to look up a model from an "app_label.model_name" string.
    """
    try:
        return apps.get_model(model_identifier)
    except (LookupError, TypeError):
        raise base.DeserializationError("Invalid model identifier: '%s'" % model_identifier)
