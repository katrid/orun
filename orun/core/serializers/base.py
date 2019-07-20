from io import StringIO

from orun.db import DEFAULT_DB_ALIAS


class SerializerDoesNotExist(KeyError):
    """The requested serializer was not found."""
    pass


class SerializationError(Exception):
    """Something bad happened during serialization."""
    pass


class DeserializationError(Exception):
    """Something bad happened during deserialization."""

    @classmethod
    def WithData(cls, original_exc, model, fk, field_value):
        """
        Factory method for creating a deserialization error which has a more
        explanatory message.
        """
        return cls("%s: (%s:pk=%s) field_value was '%s'" % (original_exc, model, fk, field_value))


class ProgressBar(object):
    progress_width = 75

    def __init__(self, output, total_count):
        self.output = output
        self.total_count = total_count
        self.prev_done = 0

    def update(self, count):
        if not self.output:
            return
        perc = count * 100 // self.total_count
        done = perc * self.progress_width // 100
        if self.prev_done >= done:
            return
        self.prev_done = done
        cr = '' if self.total_count == 1 else '\r'
        self.output.write(cr + '[' + '.' * done + ' ' * (self.progress_width - done) + ']')
        if done == self.progress_width:
            self.output.write('\n')
        self.output.flush()


class Serializer(object):
    """
    Abstract serializer base class.
    """

    # Indicates if the implemented serializer is only available for
    # internal Orun use.
    internal_use_only = False
    progress_class = ProgressBar
    stream_class = StringIO

    def serialize(self, queryset, **options):
        """
        Serialize a queryset.
        """
        self.options = options

        self.stream = options.pop("stream", self.stream_class())
        self.selected_fields = options.pop("fields", None)
        self.use_natural_foreign_keys = options.pop('use_natural_foreign_keys', False)
        self.use_natural_primary_keys = options.pop('use_natural_primary_keys', False)
        progress_bar = self.progress_class(
            options.pop('progress_output', None), options.pop('object_count', 0)
        )

        self.start_serialization()
        self.first = True
        for count, obj in enumerate(queryset, start=1):
            self.start_object(obj)
            # Use the concrete parent class' _meta instead of the object's _meta
            # This is to avoid local_fields problems for proxy models. Refs #17717.
            concrete_model = obj._meta.concrete_model
            for field in concrete_model._meta.local_fields:
                if field.serialize:
                    if field.remote_field is None:
                        if self.selected_fields is None or field.attname in self.selected_fields:
                            self.handle_field(obj, field)
                    else:
                        if self.selected_fields is None or field.attname[:-3] in self.selected_fields:
                            self.handle_fk_field(obj, field)
            for field in concrete_model._meta.many_to_many:
                if field.serialize:
                    if self.selected_fields is None or field.attname in self.selected_fields:
                        self.handle_m2m_field(obj, field)
            self.end_object(obj)
            progress_bar.update(count)
            if self.first:
                self.first = False
        self.end_serialization()
        return self.getvalue()

    def start_serialization(self):
        """
        Called when serializing of the queryset starts.
        """
        raise NotImplementedError('subclasses of Serializer must provide a start_serialization() method')

    def end_serialization(self):
        """
        Called when serializing of the queryset ends.
        """
        pass

    def start_object(self, obj):
        """
        Called when serializing of an object starts.
        """
        raise NotImplementedError('subclasses of Serializer must provide a start_object() method')

    def end_object(self, obj):
        """
        Called when serializing of an object ends.
        """
        pass

    def handle_field(self, obj, field):
        """
        Called to handle each individual (non-relational) field on an object.
        """
        raise NotImplementedError('subclasses of Serializer must provide an handle_field() method')

    def handle_fk_field(self, obj, field):
        """
        Called to handle a ForeignKey field.
        """
        raise NotImplementedError('subclasses of Serializer must provide an handle_fk_field() method')

    def handle_m2m_field(self, obj, field):
        """
        Called to handle a ManyToManyField.
        """
        raise NotImplementedError('subclasses of Serializer must provide an handle_m2m_field() method')

    def getvalue(self):
        """
        Return the fully serialized queryset (or None if the output stream is
        not seekable).
        """
        if callable(getattr(self.stream, 'getvalue', None)):
            return self.stream.getvalue()


class Deserializer:
    """
    Abstract base deserializer class.
    """
    def __init__(self, app, stream_or_string=None, filename=None, app_config=None, **kwargs):
        self.app = app
        self.app_config = app_config
        self.stream_or_string = stream_or_string
        self.filename = filename
        self.options = kwargs
        self.encoding = kwargs.get('encoding', 'utf-8')
        self.postpone = None

    def from_file(self, filename: str, encoding: str='utf-8'):
        with open(filename, encoding=encoding) as f:
            self.options['filename'] = filename
            try:
                self.deserialize(f)
            except:
                print('Error loading the file %s on module: %s' % (filename, self.app_config))
                raise

    def deserialize(self, stream_or_string):
        raise NotImplemented

    def execute(self):
        # load file
        self.from_file(self.filename, self.encoding)

    def build_instance(self, model, values, using=DEFAULT_DB_ALIAS):
        obj = model(**values)
        obj.save()
        return obj
