# from contextvars import ContextVar
from threading import local
# TODO replace by contextvar


_MESSAGES = local()


def _add_message(level: str, message: str):
    # msg = _MESSAGES.get([])
    msgs = getattr(_MESSAGES, 'messages', [])
    msgs.append({'type': level, 'message': message})
    _MESSAGES.messages = msgs


def get():
    msgs = getattr(_MESSAGES, 'messages', None)
    return msgs


def warning(message: str):
    _add_message('warning', message)


def success(message: str):
    _add_message('success', message)


def info(message: str):
    _add_message('info', message)


def error(message: str):
    _add_message('error', message)
