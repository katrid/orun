from orun.dispatch import Signal

request_started = Signal(providing_args=["environ"])
request_finished = Signal()
got_request_exception = Signal(providing_args=["request"])
setting_changed = Signal(providing_args=["setting", "value", "enter"])
app_started = Signal()
