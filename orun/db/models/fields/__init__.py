import itertools
import decimal
import datetime
from functools import partialmethod
import base64
import warnings
import sqlalchemy as sa
from sqlalchemy import Column
from sqlalchemy.engine import Engine
from sqlalchemy import FetchedValue

from orun.core import validators, exceptions
from orun.conf import settings
from orun.utils.translation import gettext
from orun.utils.text import capfirst
from orun.utils.encoding import force_str
from orun.utils.functional import cached_property
from orun.utils.datastructures import DictWrapper


# The values to use for "blank" in SelectFields. Will be appended to the start
# of most "choices" lists.
BLANK_CHOICE_DASH = [("", "---------")]


class NOT_PROVIDED:
    pass


class Fields(list):
    def __init__(self, meta, *args):
        self.meta = meta
        self._dict = {}
        super().__init__(*args)

    def insert(self, index: int, object):
        self._dict[object.name] = object
        super().insert(index, object)

    def append(self, object):
        self._dict[object.name] = object
        super().append(object)

    def get(self, item):
        return self._dict.get(item)

    def __getitem__(self, item):
        if isinstance(item, str):
            return self._dict[item]
        return super().__getitem__(item)

    def __setitem__(self, key, value):
        if isinstance(key, str):
            self._dict[key] = value
        else:
            super().__setitem__(key, value)

    def __contains__(self, item):
        if isinstance(item, str):
            return item in self._dict
        return super().__contains__(item)

    def __getattr__(self, item):
        return self[item]


class BaseField:
    _args = None
    _kwargs = None
    base_field = None
    label = None
    help_text = None
    primary_key = None
    required = False
    null = True
    default = NOT_PROVIDED

    def __new__(cls, *args, **kwargs):
        field = super().__new__(cls)
        if kwargs or args:
            field._args = args
            field._kwargs = kwargs
        return field

    def assign(self, other=None):
        args = ()
        attrs = {}
        if other:
            if other._args:
                args = other._args
            if other._kwargs:
                attrs.update(other._kwargs)
        if self._args:
            args = self._args
        if self._kwargs:
            attrs.update(self._kwargs)
        new_field = self.__class__(*args, **attrs)
        new_field.base_field = self
        return new_field

    def get_type(self):
        return self.__class__.__name__

    def __set_name__(self, owner, name):
        self.name = name


class Field(BaseField):
    db_type = sa.String
    name: str = None
    column = None
    model = None
    inherited = False
    set = None
    nested_data = False
    empty_values = list(validators.EMPTY_VALUES)
    bind: Engine = None
    default_validators = []  # Default set of validators
    many_to_many = False
    many_to_one = False
    one_to_many = False
    one_to_one = False
    related = None

    def __init__(self, label=None, max_length=None, null=True, primary_key=False, column=None, concrete=None,
                 help_text=None, required=None, readonly=None, widget_attrs=None, choices=None, rel=None,
                 copy=None, editable=True, serializable=True, default=NOT_PROVIDED, getter=None, setter=None,
                 db_column=None, db_tablespace=None, db_index=False, db_default=NOT_PROVIDED, db_compute=None,
                 unique=False, validators=None, deferred=None, proxy=None, auto_created=False, descriptor=None,
                 description=None, translate=None, template=None, *args, **kwargs):
        self.local = True
        self.auto_created = auto_created
        self.label = label or kwargs.get('verbose_name')
        self.max_length = max_length
        self.editable = editable
        self.serializable = serializable
        self.default = default
        self.primary_key = primary_key
        self.column = column
        self.db_column = db_column
        self.db_tablespace = db_tablespace or settings.DEFAULT_TABLESPACE
        self.db_index = db_index
        self.db_default = db_default
        self.db_compute = db_compute
        self.db_persisted = kwargs.get('db_persisted')
        self.unique = unique
        self.null = null
        self.help_text = help_text
        self.description = description
        self.rel = rel
        if isinstance(choices, dict):
            choices = tuple(choices.items())
        self.choices = choices
        self.deferred = deferred
        self.translate = translate
        self.widget_attrs = widget_attrs
        self.template = template
        if isinstance(proxy, str):
            proxy = proxy.split('.')
            if getter is None:
                getter = lambda instance: self.get_proxy_field_value(instance)
        self.proxy_field = proxy

        if getter is not None:
            pargs = [getter]
            if setter is not None:
                pargs.append(setter)
            descriptor = pargs
        self.descriptor = descriptor
        if concrete is None and descriptor is not None:
            concrete = False
        else:
            concrete = True
        self.concrete = concrete

        if readonly is None:
            if concrete:
                readonly = False
            else:
                readonly = True
        self.readonly = readonly

        if required is None and null is False:
            required = True
        self.required = required
        self.concrete = concrete
        self.attname = None
        self._validators = validators or []

        if copy is None:
            self.copy = not self.primary_key and self.concrete and not auto_created
        else:
            self.copy = copy

    @property
    def caption(self):
        return self.label

    def contribute_to_class(self, cls, name):
        self.column = None
        self.model = cls
        self.set_attributes_from_name(name)
        self.model._meta.add_field(self)
        if self.concrete:
            self.column = self.create_column()
        if self.label is None:
            self.label = self.name

        if self.choices:
            setattr(cls, 'get_%s_display' % self.name, partialmethod(cls._get_FIELD_display, field=self))

    def create_column(self, *args, **kwargs):
        args = (self.db_type,) + args
        if self.primary_key:
            kwargs['primary_key'] = self.primary_key
        if self.null is False:
            kwargs['nullable'] = False
        if self.default is not NOT_PROVIDED:
            kwargs['default'] = self.default
        if self.db_compute:
            kwargs['info'] = {'compute': self.db_compute}
            args += (sa.FetchedValue(),)
        return sa.Column(self.db_column, *args, **kwargs)

    def set_attributes_from_name(self, name):
        if not self.name:
            self.name = name
        if self.concrete is not False:
            self.attname, self.db_column = self.get_attname_column()
            self.concrete = self.db_column is not None
        if self.label is None and self.name:
            self.label = self.name.replace('_', ' ')

    def get_attname(self):
        return self.name

    def get_attname_column(self):
        attname = self.get_attname()
        column = self.db_column or attname
        return attname, column

    def db_type_parameters(self, connection):
        return DictWrapper(self.__dict__, connection.ops.quote_name, 'qn_')

    def db_check(self, connection):
        """
        Return the database column check constraint for this field, for the
        provided connection. Works the same way as db_type() for the case that
        get_internal_type() does not map to a preexisting model field.
        """
        data = self.db_type_parameters(connection)
        try:
            return connection.data_type_check_constraints[self.get_internal_type()] % data
        except KeyError:
            return None

    def _db_type(self, connection):
        """
        Return the database column data type for this field, for the provided
        connection.
        """
        # The default implementation of this method looks at the
        # backend-specific data_types dictionary, looking up the field by its
        # "internal type".
        #
        # A Field class can implement the get_internal_type() method to specify
        # which *preexisting* Orun Field class it's most similar to -- i.e.,
        # a custom field might be represented by a TEXT column type, which is
        # the same as the TextField Orun field type, which means the custom
        # field's get_internal_type() returns 'TextField'.
        #
        # But the limitation of the get_internal_type() / data_types approach
        # is that it cannot handle database column types that aren't already
        # mapped to one of the built-in Orun field types. In this case, you
        # can implement db_type() instead of get_internal_type() to specify
        # exactly which wacky database column type you want to use.
        data = self.db_type_parameters(connection)
        try:
            return connection.data_types[self.get_internal_type()] % data
        except KeyError:
            return None

    def rel_db_type(self, connection):
        """
        Return the data type that a related field pointing to this field should
        use. For example, this method is called by ForeignKey and OneToOneField
        to determine its data type.
        """
        return self._db_type(connection)

    def get_internal_type(self):
        return self.__class__.__name__

    def db_parameters(self, connection):
        """
        Extension of db_type(), providing a range of different return values
        (type, checks). This will look at db_type(), allowing custom model
        fields to override it.
        """
        type_string = self._db_type(connection)
        check_string = self.db_check(connection)
        return {
            "type": type_string,
            "check": check_string,
        }

    def __str__(self):
        """ Return "app_label.model_label.field_name". """
        return '%s.%s' % (str(self.model._meta), self.name)

    def __repr__(self):
        """Display the module, class, and name of the field."""
        path = '%s.%s' % (self.__class__.__module__, self.__class__.__qualname__)
        name = getattr(self, 'name', None)
        if name is not None:
            return '<%s: %s>' % (path, name)
        return '<%s>' % path

    def _prepare(self):
        if self.column is None and self.db_column:
            self.column = self.create_column()

    def _formfield(self):
        info = {
            'name': self.name,
            'help_text': self.help_text,
            'required': self.required,
            'readonly': self.readonly,
            'editable': self.editable,
            'type': self.get_type(),
            'caption': capfirst(self.label),
            'choices': self.choices,
            'onchange': self.name in self.model._meta.field_change_event if self.model else None,
            'attrs': self.widget_attrs,
        }
        if self.max_length:
            info['max_length'] = self.max_length
        if self.template:
            info['template'] = self.template
        return info


    @cached_property
    def formfield(self):
        """Return a dict with the form field information to be evaluated by the client side."""
        return self._formfield()

    def get_type(self):
        return self.__class__.__name__

    def to_python(self, value):
        if value == '':
            return None
        return value

    def to_json(self, value):
        """
        Converts a python value to a serializable value.
        """
        return value

    def _get_flatchoices(self):
        """Flattened version of choices tuple."""
        flat = []
        for choice, value in self.choices:
            if isinstance(value, (list, tuple)):
                flat.extend(value)
            else:
                flat.append((choice, value))
        return flat
    flatchoices = property(_get_flatchoices)

    @cached_property
    def validators(self):
        """
        Some validators can't be created at field initialization time.
        This method provides a way to delay their creation until required.
        """
        return list(itertools.chain(self.default_validators, self._validators))

    def run_validators(self, value):
        if value in self.empty_values:
            return

        errors = []
        for v in self.validators:
            try:
                v(value)
            except exceptions.ValidationError as e:
                if hasattr(e, 'code') and e.code in self.error_messages:
                    e.message = self.error_messages[e.code]
                errors.extend(e.error_list)

        if errors:
            raise exceptions.ValidationError(errors)


    def validate(self, value, instance):
        """
        Validates value and throws ValidationError. Subclasses should override
        this to provide validation logic.
        """
        if not self.editable:
            # Skip validation for non-editable fields.
            return

        if self.choices and value not in self.empty_values:
            for option_key, option_value in self.choices:
                if isinstance(option_value, (list, tuple)):
                    # This is an optgroup, so look inside the group for
                    # options.
                    for optgroup_key, optgroup_value in option_value:
                        if value == optgroup_key:
                            return
                elif value == option_key:
                    return
            raise exceptions.ValidationError(
                'invalid choice',
                code='invalid_choice',
                params={'value': value},
            )

        # if value is None and not self.null:
        #     raise exceptions.ValidationError(self.error_messages['null'], code='null')

        if self.required and self.default is NOT_PROVIDED and value in self.empty_values:
            raise exceptions.ValidationError('O campo "%s" é obrigatório.' % self.label, code='required')

    def clean(self, value, instance):
        """
        Convert the value's type and run validation. Validation errors
        from to_python and validate are propagated. The correct value is
        returned if no error is raised.
        """
        self.validate(value, instance)
        self.run_validators(value)
        return value



class CharField(Field):
    def __init__(self, label_or_max_length=None, label=None, *args, **kwargs):
        max_length = kwargs.pop('max_length', 512)
        if isinstance(label_or_max_length, int):
            max_length = label_or_max_length
        elif isinstance(label_or_max_length, str):
            label = label_or_max_length

        super().__init__(label=label, max_length=max_length, *args, **kwargs)

    def to_python(self, value):
        if value is not None:
            value = str(value)
        return super().to_python(value)

    def to_json(self, value):
        if value is None:
            value = ''
        if self.translate:
            value = gettext(value)
        else:
            value = str(value)
        return value

    def get_internal_type(self):
        return "CharField"


class IntegerField(Field):
    db_type = sa.Integer()

    def get_type(self):
        return 'IntegerField'


class BigIntegerField(IntegerField):
    db_type = sa.BigInteger()


class AutoField(IntegerField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('primary_key', True)
        kwargs['required'] = False
        kwargs.setdefault('editable', False)
        kwargs.setdefault('readonly', True)
        super().__init__(*args, **kwargs)

    def _db_type(self, connection):
        return IntegerField()._db_type(connection=connection)


class BigAutoField(AutoField):
    db_type = sa.BigInteger().with_variant(sa.Integer, 'sqlite')

    def _db_type(self, connection):
        return BigIntegerField()._db_type(connection=connection)


class TextField(Field):
    db_type = sa.Text


class BooleanField(Field):
    db_type = sa.Boolean(create_constraint=False)

    _bool_values = {
        'True': True,
        'False': False,
        '1': True,
        '0': False,
    }

    def to_python(self, value):
        return super().to_python(self._bool_values.get(value, value))


class DateTimeField(Field):
    db_type = sa.DateTime()

    def __init__(self, *args, **kwargs):
        auto_now_add = kwargs.pop('auto_now_add', None)
        if auto_now_add:
            kwargs.setdefault('default', datetime.datetime.now)
        super(DateTimeField, self).__init__(*args, **kwargs)

    def to_python(self, value):
        # Try the ISO format and then settings.DATE_INPUT_FORMATS
        for format in settings.DATETIME_INPUT_FORMATS:
            try:
                return datetime.datetime.strptime(force_str(value), format)
            except (ValueError, TypeError):
                continue

    def to_json(self, value):
        if isinstance(value, datetime.date):
            return str(value.strftime('%Y-%m-%dT%H:%M:%S'))
        return value


class DateField(DateTimeField):
    db_type = sa.Date()

    def to_python(self, value):
        # Try the ISO format and then settings.DATE_INPUT_FORMATS
        for format in settings.DATE_INPUT_FORMATS:
            try:
                return datetime.datetime.strptime(force_str(value), format).date()
            except (ValueError, TypeError):
                continue

    def to_json(self, value):
        if value:
            return str(value.strftime('%Y-%m-%d'))
        return value


class TimeField(DateTimeField):
    db_type = sa.Time()

    def to_python(self, value):
        # Try the ISO fot and then settings.DATE_INPUT_FORMATS
        for format in settings.TIME_INPUT_FORMATS:
            try:
                return datetime.datetime.strptime(force_str(value), format).time()
            except (ValueError, TypeError):
                continue


class SmallIntegerField(IntegerField):
    db_type = sa.SmallInteger()


class PositiveIntegerField(IntegerField):
    pass


class PositiveSmallIntegerField(SmallIntegerField):
    pass


class FloatField(Field):
    db_type = sa.Float()


class DecimalField(FloatField):
    def __init__(self, digits=29, decimal_places=6, *args, **kwargs):
        self.digits = digits
        self.max_digits = digits
        self.decimal_places = decimal_places
        super(DecimalField, self).__init__(*args, **kwargs)
        self.db_type = sa.Numeric(self.digits, self.decimal_places)

    def to_python(self, value):
        if isinstance(value, str):
            value = value.replace(',', '.')
        if isinstance(value, (str, float)):
            value = decimal.Decimal(str(value))
        if value is not None:
            value = round(value, self.decimal_places)
        return super(DecimalField, self).to_python(value)

    def to_json(self, value):
        if value is not None:
            return float(value)


class EmailField(CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 256)
        super(EmailField, self).__init__(*args, **kwargs)


class URLField(CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 1024)
        super(URLField, self).__init__(*args, **kwargs)


class SelectionField(CharField):
    def __init__(self, *args, **kwargs):
        if args and isinstance(args[0], (list, tuple, dict)):
            kwargs['choices'] = args[0]
        kwargs.setdefault('max_length', 32)
        super(SelectionField, self).__init__(*args[1:], **kwargs)


class PasswordField(CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 128)
        super(PasswordField, self).__init__(*args, **kwargs)

    def to_python(self, value):
        from orun.auth.hashers import is_password_usable, make_password
        if is_password_usable:
            return make_password(value)
        return value


class SlugField(CharField):
    pass


class BinaryField(Field):
    db_type = sa.LargeBinary()

    def __init__(self, attachment=None, storage='db', *args, **kwargs):
        kwargs.setdefault('deferred', not attachment)
        super(BinaryField, self).__init__(*args, **kwargs)
        self.attachment = attachment
        self.storage = storage

    def to_python(self, value):
        from orun import app
        if value and self.attachment:
            # check if value is base64 encoded
            if value.startswith('data:'):
                value = value.split('data:', 1)[1]
                mime, value = value.split(';', 1)
                value = value.split('base64,')[1]
                value = base64.decodebytes(value.encode('utf-8'))
                value = app['ir.attachment'].create(
                    name=self.name, mimetype=mime, content=value, model=self.model._meta.name, field=self.name,
                ).id
                return str(value).encode('utf-8')
        return value

    def to_json(self, value):
        # TODO adjust image download url f'/web/image/{self.model._meta.name}/{self.name}/{instance.pk}/'
        if self.attachment:
            if value:
                return f'/web/content/{value.decode("utf-8")}/?download'


class FileField(BinaryField):
    pass


class ImageField(FileField):
    pass


class XmlField(TextField):
    pass


class HtmlField(XmlField):
    pass


class JsonField(TextField):
    pass


class PythonCodeField(TextField):
    pass


class FilePathField(CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 1024)
        super(FilePathField, self).__init__(*args, **kwargs)


class ImagePathField(FilePathField):
    pass


class field_property(object):
    def __init__(self, field_name, fget, fset=None):
        self.field_name = field_name
        self.fget = fget
        self.fset = fset

    def __get__(self, instance, owner):
        if instance:
            return self.fget(instance)
        meta = owner._meta
        return meta.fields_dict[self.field_name]

    def __set__(self, instance, value):
        self.fset(instance, value)


from .related import OneToOneField
