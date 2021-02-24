"""
Serialize data to/from JSON
"""

import datetime
import decimal
import json
import uuid
import types
import base64

from orun.core.files import File
from orun.core.serializers.base import DeserializationError, Deserializer as BaseDeserializer
from orun.core.serializers.python import (
    Deserializer as PythonDeserializer, Serializer as PythonSerializer,
)
from orun.utils.duration import duration_iso_string
from orun.utils.functional import Promise
from orun.utils.timezone import is_aware
from orun.db import models


class Serializer(PythonSerializer):
    """Convert a queryset to JSON."""
    internal_use_only = False

    def _init_options(self):
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
        # Grandparent super
        return super(PythonSerializer, self).getvalue()


class Deserializer(BaseDeserializer):
    def deserialize(self):
        """Deserialize a stream or string of JSON data."""
        stream_or_string = self.stream.read()
        if isinstance(stream_or_string, bytes):
            stream_or_string = stream_or_string.decode()
        try:
            objects = json.loads(stream_or_string)
            for obj in objects:
                data = obj['fields']
                data['pk'] = obj['pk']
                for new_obj in PythonDeserializer([data], **self.options, model=obj['model']):
                    pass
        except (GeneratorExit, DeserializationError):
            raise
        except Exception as exc:
            raise DeserializationError() from exc


class OrunJSONEncoder(json.JSONEncoder):
    """
    JSONEncoder subclass that knows how to encode date/time, decimal types, and
    UUIDs.
    """
    def default(self, o):
        # See "Date Time String Format" in the ECMA-262 specification.
        if isinstance(o, models.Model):
            if hasattr(o, '__serialize__'):
                return o.to_json()
            return o._api_format_choice()
        elif isinstance(o, types.GeneratorType):
            return list(o)
        elif isinstance(o, datetime.datetime):
            r = o.isoformat()
            if o.microsecond:
                r = r[:23] + r[26:]
            if r.endswith('+00:00'):
                r = r[:-6] + 'Z'
            return r
        elif isinstance(o, datetime.date):
            return o.isoformat()
        elif isinstance(o, datetime.time):
            if is_aware(o):
                raise ValueError("JSON can't represent timezone-aware times.")
            r = o.isoformat()
            if o.microsecond:
                r = r[:12]
            return r
        elif isinstance(o, datetime.timedelta):
            return duration_iso_string(o)
        elif isinstance(o, (decimal.Decimal, uuid.UUID, Promise)):
            return str(o)
        elif isinstance(o, memoryview):
            return base64.b64encode(o.tobytes()).decode('utf-8')
        elif isinstance(o, bytes):
            return o.decode('utf-8')
        else:
            return super().default(o)
