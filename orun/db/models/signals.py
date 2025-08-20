from functools import partial, wraps
from typing import Union, List, Optional, TYPE_CHECKING, overload, override, Callable
from collections import defaultdict
import threading

from orun.apps import apps
from orun.db.models.utils import make_model_name
from orun.dispatch import Signal

if TYPE_CHECKING:
    from orun.db.models import Model

class_prepared = Signal(providing_args=["class"])


class ModelSignal(Signal):
    """
    Signal subclass that allows the sender to be lazily specified as a string
    of the `app_label.ModelName` form.
    """

    def _lazy_method(self, method, apps, receiver, sender, **kwargs):
        from orun.db.models.options import Options
        from orun.db.models.base import ModelBase

        # This partial takes a single optional argument named "sender".
        partial_method = partial(method, receiver, **kwargs)
        apps = apps or Options.default_apps
        if isinstance(sender, ModelBase):
            apps.lazy_model_operation(partial_method, sender.Meta.name)
        elif isinstance(sender, str):
            apps.lazy_model_operation(partial_method, sender)
        else:
            return partial_method(sender)

    def connect(self, receiver, sender=None, weak=True, dispatch_uid=None, apps=None):
        self._lazy_method(
            super().connect, apps, receiver, sender,
            weak=weak, dispatch_uid=dispatch_uid,
        )

    def disconnect(self, receiver=None, sender=None, dispatch_uid=None, apps=None):
        return self._lazy_method(
            super().disconnect, apps, receiver, sender, dispatch_uid=dispatch_uid
        )


pre_init = ModelSignal(providing_args=["instance", "args", "kwargs"], use_caching=True)
post_init = ModelSignal(providing_args=["instance"], use_caching=True)

pre_save = ModelSignal(providing_args=["instance", "raw", "using", "update_fields"],
                       use_caching=True)
post_save = ModelSignal(providing_args=["instance", "raw", "created", "using", "update_fields"], use_caching=True)

pre_delete = ModelSignal(providing_args=["instance", "using"], use_caching=True)
post_delete = ModelSignal(providing_args=["instance", "using"], use_caching=True)

m2m_changed = ModelSignal(
    providing_args=["action", "instance", "reverse", "model", "pk_set", "using"],
    use_caching=True,
)

pre_migrate = Signal(providing_args=["app_config", "verbosity", "interactive", "using", "apps", "plan"])
post_migrate = Signal(providing_args=["app_config", "verbosity", "interactive", "using", "apps", "plan"])
post_sync = Signal(providing_args=["verbosity", "interactive", "using", "apps"])


class RecordSignal:
    def __init__(self, when: str, op: str):
        self.lock = threading.Lock()
        self.when = when
        self.op = op
        self.listeners: dict[type[Model], List[Callable]] = defaultdict(list)

    def connect(self, sender, receiver):
        with self.lock:
            self.listeners[sender].append(receiver)

    def disconnect(self, sender, receiver):
        with self.lock:
            if sender in self.listeners and receiver in self.listeners[sender]:
                self.listeners[sender].remove(receiver)

    @override
    def send(self, sender: 'Model', *args, **kwargs):
        if sender.__class__ in self.listeners:
            for receiver in self.listeners[sender.__class__]:
                receiver(sender, *args, **kwargs)


class RecordEvent:
    def __init__(self, signal, model):
        self.signal: RecordSignal = signal
        self.model: str = model
        self.instance: Optional[Model] = None

    def update(self, field: str) -> bool:
        return field in self.instance._state.update_fields

    @property
    def update_fields(self):
        return self.instance._state.update_fields


# trigger decorator
def trigger(signal: RecordSignal, model: str | type['Model'], when: Callable = None):
    def inner(fn):
        @wraps(fn)
        def wrapper(event: RecordEvent, instance, *args, **kwargs):
            event.instance = instance
            if when is None or when(instance, event):
                return fn(instance, *args, **kwargs)
            return None

        signal.connect(model, partial(wrapper, RecordEvent(signal, model)))
        return wrapper

    return inner


before_insert = RecordSignal('before', 'insert')
before_update = RecordSignal('before', 'update')
before_delete = RecordSignal('before', 'delete')

after_insert = RecordSignal('after', 'insert')
after_update = RecordSignal('after', 'update')
after_delete = RecordSignal('after', 'delete')
