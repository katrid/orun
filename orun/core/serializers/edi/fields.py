import datetime
import re


class Field:
    name: str = None

    def __init__(self, fixed_length=None, validators=None, trim=None):
        self.fixed_length = fixed_length
        if self.fixed_length and trim is None:
            self.trim = True
        else:
            self.trim = trim

    def __set_name__(self, owner, name):
        self.name = name
        owner.fields[name] = self

    def __get__(self, instance, owner):
        if instance is not None:
            return self.to_python(instance._values.get(self.name))

    def to_python(self, value):
        if self.fixed_length and len(value) != self.fixed_length:
            raise ValueError('Invalid field value length')
        if value == '':
            value = None
        if isinstance(value, str) and self.trim:
            return value.strip()
        return value


class StringField(Field):
    pass


class DateField(Field):
    input_format = '%Y-%m-%d'

    def to_python(self, value):
        if value:
            return datetime.datetime.strptime(value, self.input_format)
        return super().to_python(value)


class DateTimeField(DateField):
    input_format = '%Y-%m-%d %H:%M:%S'


class IntegerField(Field):
    def to_python(self, value):
        if value:
            return int(value)
        return super().to_python(value)
