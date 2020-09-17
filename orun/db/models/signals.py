from functools import partial, wraps
from typing import Union, List, Optional, TYPE_CHECKING

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


class TriggerSignal(Signal):
    def __init__(self, when: str, op: str, providing_args=None, use_caching=False):
        self.when = when
        self.op = op
        self.models: List[str] = []
        super().__init__(providing_args=providing_args, use_caching=use_caching)

    def connect(self, receiver, sender=None, weak=True, dispatch_uid=None):
        super().connect(receiver, sender=sender, weak=weak, dispatch_uid=dispatch_uid)
        with self.lock:
            self.models.append(sender)


class TriggerEvent:
    def __init__(self, signal, model):
        self.signal: TriggerSignal = signal
        self.model: str = model
        self.instance: Optional[Model] = None

    def update(self, field: str) -> bool:
        return field in self.instance._state.update_fields

    @property
    def update_fields(self):
        return self.instance._state.update_fields


# trigger decorator
def trigger(signal: TriggerSignal, model: str):
    def inner(fn):
        def wrap(event: TriggerEvent, old, new, *args, **kwargs):
            event.instance = new or old
            return fn(event, old, new)

        signal.connect(partial(wrap, TriggerEvent(signal, model)), sender=model, weak=False)
        return wrap
    return inner


before_insert = TriggerSignal('before', 'insert', providing_args=["instance", "args", "kwargs"], use_caching=False)
before_update = TriggerSignal('before', 'update', providing_args=["instance", "args", "kwargs"], use_caching=False)
before_delete = TriggerSignal('before', 'delete', providing_args=["instance", "args", "kwargs"], use_caching=False)

after_insert = TriggerSignal('after', 'insert', providing_args=["instance", "args", "kwargs"], use_caching=False)
after_update = TriggerSignal('after', 'update', providing_args=["instance", "args", "kwargs"], use_caching=False)
after_delete = TriggerSignal('after', 'delete', providing_args=["instance", "args", "kwargs"], use_caching=False)
