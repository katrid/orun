from typing import Callable
import weakref
import inspect


class Event:
    validate_var_keyword = False
    name: str
    args: tuple | None
    kwargs: dict | None

    def __init__(self, name: str):
        self.name = name
        self.listeners = set()
        self.once = set()
        self.args = None
        self.kwargs = None

    def add_listener(self, listener: Callable, weak=False, once=False):
        # Validate that receiver accepts **kwargs
        if self.validate_var_keyword:
            sig = inspect.signature(listener)
            if not any(param.kind == inspect.Parameter.VAR_KEYWORD for param in sig.parameters.values()):
                raise TypeError(f'Receiver {listener.__name__} must accept **kwargs parameter')
        if not inspect.iscoroutinefunction(listener):
            raise TypeError(f'Receiver {listener.__name__} must be a coroutine function')
        if weak:
            listener = weakref.ref(listener)
        if once:
            self.once.add(listener)
        self.listeners.add(listener)

    async def dispatch(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        for listener in self.listeners.copy():
            if listener in self.once:
                self.once.discard(listener)
                self.listeners.discard(listener)
            # Check if it's a weakref and if it's alive
            if isinstance(listener, weakref.ref):
                r = listener()
                if r is None:
                    self.listeners.discard(listener)
                    continue
            else:
                r = listener

            await r(self)
