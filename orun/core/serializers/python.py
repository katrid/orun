"""
A Python "serializer". Doesn't do much serializing per se -- just converts to
and from basic Python data types (lists, dicts, strings, etc.). Useful as a basis for
other serializers.
"""
from collections import OrderedDict

from orun.apps import apps
from orun.core.serializers import base
from orun.db import DEFAULT_DB_ALIAS, models
from orun.utils.encoding import is_protected_type


class Serializer(base.Serializer):
    """
    Serialize a QuerySet to basic Python objects.
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
        data = OrderedDict([('model', str(obj._meta))])
        if not self.use_natural_primary_keys or not hasattr(obj, 'natural_key'):
            data["pk"] = self._value_from_field(obj, obj._meta.pk)
        data['fields'] = self._current
        return data

    def _value_from_field(self, obj, field):
        value = field.value_from_object(obj)
        # Protected types (i.e., primitives like None, numbers, dates,
        # and Decimals) are passed through as is. All other values are
        # converted to string first.
        return value if is_protected_type(value) else field.value_to_string(obj)

    def handle_field(self, obj, field):
        self._current[field.name] = self._value_from_field(obj, field)

    def handle_fk_field(self, obj, field):
        if self.use_natural_foreign_keys and hasattr(field.remote_field.model, 'natural_key'):
            related = getattr(obj, field.name)
            if related:
                value = related.natural_key()
            else:
                value = None
        else:
            value = self._value_from_field(obj, field)
        self._current[field.name] = value

    def handle_m2m_field(self, obj, field):
        if field.remote_field.through._meta.auto_created:
            if self.use_natural_foreign_keys and hasattr(field.remote_field.model, 'natural_key'):
                def m2m_value(value):
                    return value.natural_key()
            else:
                def m2m_value(value):
                    return self._value_from_field(value, value._meta.pk)
            self._current[field.name] = [
                m2m_value(related) for related in getattr(obj, field.name).iterator()
            ]

    def getvalue(self):
        return self.objects


def Deserializer(object_list, *, using=DEFAULT_DB_ALIAS, ignorenonexistent=False, **options):
    """
    Deserialize simple Python objects back into Orun ORM instances.

    It's expected that you pass the Python objects themselves (instead of a
    stream or a string) to the constructor
    """
    handle_forward_references = options.pop('handle_forward_references', False)
    field_names_cache = {}  # Model: <list of field_names>

    # Look up the model and starting build a dict of data for it.
    Model = options["model"]

    for d in object_list:
        data = {}
        if 'pk' in d:
            try:
                data[Model._meta.pk.attname] = Model._meta.pk.to_python(d.get('pk'))
            except Exception as e:
                raise base.DeserializationError.WithData(e, d['model'], d.get('pk'), None)
        m2m_data = {}
        deferred_fields = {}

        if Model not in field_names_cache:
            field_names_cache[Model] = {f.name for f in Model._meta.get_fields()}
        field_names = field_names_cache[Model]

        # Handle each field
        for (field_name, field_value) in d.items():

            if ignorenonexistent and field_name not in field_names:
                # skip fields no longer on model
                continue

            # TODO cache field reference
            field_ref = None
            if '__' in field_name:
                field_name, field_ref = field_name.split('__', 1)

            field = Model._meta.get_field(field_name)

            # Handle M2M relations
            if field.remote_field and isinstance(field.remote_field, models.ManyToManyRel):
                try:
                    values = base.deserialize_m2m_values(field, field_value, using, handle_forward_references)
                except base.M2MDeserializationError as e:
                    raise base.DeserializationError.WithData(e.original_exc, d['model'], d.get('pk'), e.pk)
                if values == base.DEFER_FIELD:
                    deferred_fields[field] = field_value
                else:
                    m2m_data[field.name] = values
            # Handle FK fields
            elif field.remote_field and isinstance(field.remote_field, models.ManyToOneRel):
                if field_ref:
                    ref_val = field.remote_field.model.objects.filter(**{field_ref: field_value}).first()
                    data[field.attname] = ref_val.pk
                else:
                    if field.attname == field_name:
                        data[field.attname] = field_value
                    else:
                        try:
                            value = base.deserialize_fk_value(field, field_value, using, handle_forward_references)
                        except Exception as e:
                            raise base.DeserializationError.WithData(e, d['model'], d.get('pk'), field_value)
                        if value == base.DEFER_FIELD:
                            deferred_fields[field] = field_value
                        else:
                            data[field.attname] = value
            # Handle all other fields
            else:
                try:
                    data[field.name] = field.to_python(field_value)
                except Exception as e:
                    raise base.DeserializationError.WithData(e, d['model'], d.get('pk'), field_value)

        obj = base.build_instance(Model, data, using)
        yield base.DeserializedObject(obj, m2m_data, deferred_fields)


def _get_model(model_identifier):
    """Look up a model from an "app_label.model_name" string."""
    try:
        return apps.get_model(model_identifier)
    except (LookupError, TypeError):
        raise base.DeserializationError("Invalid model identifier: '%s'" % model_identifier)
