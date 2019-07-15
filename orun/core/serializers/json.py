"""
Serialize data to/from JSON
"""
import datetime
import decimal
import json
import sys
import uuid
from types import GeneratorType

import sqlalchemy.orm.query

from orun.core.exceptions import ValidationError
from orun.core.serializers import python
from orun.core.serializers import base
from orun.db import models
from orun.utils import reraise
from orun.utils.functional import Promise
from orun.utils.timezone import is_aware


class Serializer(python.Serializer):
    """
    Convert a queryset to JSON.
    """
    internal_use_only = False

    def _init_options(self):
        if json.__version__.split('.') >= ['2', '1', '3']:
            # Use JS strings to represent Python Decimal instances (ticket #16850)
            self.options.update({'use_decimal': False})
        self._current = None
        self.json_kwargs = self.options.copy()
        self.json_kwargs.pop('stream', None)
        self.json_kwargs.pop('fields', None)
        if self.options.get('indent'):
            # Prevent trailing spaces
            self.json_kwargs['separators'] = (',', ': ')
        self.json_kwargs.setdefault('cls', OrunJSONEncoder)

    def start_serialization(self):
        self._init_options()
        self.stream.write("[")

    def end_serialization(self):
        if self.options.get("indent"):
            self.stream.write("\n")
        self.stream.write("]")
        if self.options.get("indent"):
            self.stream.write("\n")

    def end_object(self, obj):
        # self._current has the field data
        indent = self.options.get("indent")
        if not self.first:
            self.stream.write(",")
            if not indent:
                self.stream.write(" ")
        if indent:
            self.stream.write("\n")
        json.dump(self.get_dump_object(obj), self.stream, **self.json_kwargs)
        self._current = None

    def getvalue(self):
        # Grand-parent super
        return super(python.Serializer, self).getvalue()


class Deserializer(base.Deserializer):

    def deserialize(self, stream_or_string):
        """
        Deserialize a stream or string of JSON data.
        """
        if not isinstance(stream_or_string, (bytes, str)):
            stream_or_string = stream_or_string.read()
        if isinstance(stream_or_string, bytes):
            stream_or_string = stream_or_string.decode('utf-8')
        try:
            objects = json.loads(stream_or_string)
            translate = objects.get('translate', False)
            for data in objects['data']:
                model = data['model']
                for obj in python.Deserializer(data['objects'], model=model, **self.options):
                    pass
        except GeneratorExit:
            raise
        except Exception as e:
            # Map to deserializer error
            reraise(base.DeserializationError, base.DeserializationError(e), sys.exc_info()[2])


class OrunJSONEncoder(json.JSONEncoder):
    """
    JSONEncoder subclass that knows how to encode date/time, decimal types and UUIDs.
    """
    def default(self, o):
        # See "Date Time String Format" in the ECMA-262 specification.
        if isinstance(o, datetime.datetime):
            r = o.isoformat()
            if o.microsecond:
                r = r[:23] + r[26:]
            if r.endswith('+00:00'):
                r = r[:-6] + 'Z'
            return r
        elif isinstance(o, bytes):
            return o.decode()
        elif isinstance(o, models.Model):
            if hasattr(o, '__serialize__'):
                return o.serialize()
            return o._get_instance_label()
        elif isinstance(o, sqlalchemy.orm.query.Query):
            return [r for r in o]
        elif isinstance(o, datetime.date):
            return o.isoformat()
        elif isinstance(o, datetime.time):
            if is_aware(o):
                raise ValueError("JSON can't represent timezone-aware times.")
            r = o.isoformat()
            if o.microsecond:
                r = r[:12]
            return r
        elif isinstance(o, (decimal.Decimal, uuid.UUID, Promise)):
            return str(o)
        elif isinstance(o, GeneratorType):
            return [obj for obj in o]
        elif isinstance(o, ValidationError):
            return ValidationError
        else:
            return super(OrunJSONEncoder, self).default(o)

# Older, deprecated class name (for backwards compatibility purposes).
DateTimeAwareJSONEncoder = OrunJSONEncoder
