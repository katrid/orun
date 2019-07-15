import warnings
from functools import partial

from orun.db.models.utils import make_model_tuple
from orun.dispatch import Signal


class_prepared = Signal()


class ModelSignal(Signal):
    """
    Signal subclass that allows the sender to be lazily specified as a string
    of the `app_label.ModelName` form.
    """
    def _lazy_method(self, method, apps, receiver, sender, **kwargs):
        from orun.db.models.options import Options

        # This partial takes a single optional argument named "sender".
        partial_method = partial(method, receiver, **kwargs)
        if isinstance(sender, str):
            apps = apps or Options.default_apps
            apps.lazy_model_operation(partial_method, make_model_tuple(sender))
        else:
            return partial_method(sender)

    def connect(self, receiver, sender=None, weak=True, dispatch_uid=None, apps=None):
        self._lazy_method(
            super(ModelSignal, self).connect, apps, receiver, sender,
            weak=weak, dispatch_uid=dispatch_uid,
        )

    def disconnect(self, receiver=None, sender=None, weak=None, dispatch_uid=None, apps=None):
        if weak is not None:
            warnings.warn("Passing `weak` to disconnect has no effect.", RemovedInOrun20Warning, stacklevel=2)
        return self._lazy_method(
            super(ModelSignal, self).disconnect, apps, receiver, sender, dispatch_uid=dispatch_uid
        )


pre_init = Signal()
post_init = Signal()

pre_save = Signal()
post_save = Signal()

pre_delete = Signal()
post_delete = Signal()

m2m_changed = Signal()

pre_migrate = Signal()
post_migrate = Signal()
