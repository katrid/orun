import importlib

from orun.conf import settings
from .base import SerializerDoesNotExist, Deserializer


# Built-in serializers
BUILTIN_SERIALIZERS = {
    "xml": "orun.core.serializers.xml_serializer",
    "txt": "orun.core.serializers.txt",
    "csv": "orun.core.serializers.csv",
    "python": "orun.core.serializers.python",
    "json": "orun.core.serializers.json",
    "sql": "orun.core.serializers.sql",
    "jinja2": "orun.core.serializers.jinja2_serializer",
    #"yaml": "orun.core.serializers.pyyaml",
}

_serializers = {}


def register_serializer(fmt, serializer_module, serializers=None):
    """Register a new serializer.

    ``serializer_module`` should be the fully qualified module name
    for the serializer.

    If ``serializers`` is provided, the registration will be added
    to the provided dictionary.

    If ``serializers`` is not provided, the registration will be made
    directly into the global register of serializers. Adding serializers
    directly is not a thread-safe operation.
    """
    if serializers is None and not _serializers:
        _load_serializers()

    module = importlib.import_module(serializer_module)

    if serializers is None:
        _serializers[fmt] = module
    else:
        serializers[fmt] = module


def _load_serializers():
    """
    Register built-in and settings-defined serializers. This is done lazily so
    that user code has a chance to (e.g.) set up custom settings without
    needing to be careful of import order.
    """
    global _serializers
    serializers = {}
    for fmt in BUILTIN_SERIALIZERS:
        register_serializer(fmt, BUILTIN_SERIALIZERS[fmt], serializers)
    if hasattr(settings, "SERIALIZATION_MODULES"):
        for fmt in settings.SERIALIZATION_MODULES:
            register_serializer(fmt, settings.SERIALIZATION_MODULES[fmt], serializers)
    _serializers = serializers


def get_deserializer(fmt) -> type(Deserializer):
    if not _serializers:
        _load_serializers()
    if fmt not in _serializers:
        raise SerializerDoesNotExist(fmt)
    return _serializers[fmt].Deserializer


def deserialize(fmt, stream_or_string, **options):
    d = get_deserializer(fmt)
    return d(stream_or_string, **options).deserialize()
