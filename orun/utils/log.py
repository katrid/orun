import os
import datetime
import inspect
import logging
import logging.config  # needed when logging_config doesn't start with logging.config
from copy import copy

from orun.conf import settings
from orun.core import mail
from orun.core.mail import get_connection
from orun.core.management.color import color_style
from orun.utils.module_loading import import_string
from orun.views.debug import ExceptionReporter

request_logger = logging.getLogger('orun.request')

# Default logging for Orun. This sends an email to the site admins on every
# HTTP 500 error. Depending on DEBUG, all other log records are either sent to
# the console (DEBUG=True) or discarded (DEBUG=False) by means of the
# require_debug_true filter.
DEFAULT_LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'orun.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'orun.utils.log.RequireDebugTrue',
        },
    },
    'formatters': {
        'orun.server': {
            '()': 'orun.utils.log.ServerFormatter',
            'format': '[{server_time}] {message}',
            'style': '{',
        }
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
        },
        'orun.server': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'orun.server',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'orun.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'orun': {
            'handlers': ['console', 'mail_admins'],
            'level': 'INFO',
        },
        'orun.server': {
            'handlers': ['orun.server'],
            'level': 'INFO',
            'propagate': False,
        },
    }
}


def configure_logging(logging_config, logging_settings):
    if logging_config:
        # First find the logging configuration function ...
        logging_config_func = import_string(logging_config)

        logging.config.dictConfig(DEFAULT_LOGGING)

        # ... then invoke it with the logging settings
        if logging_settings:
            logging_config_func(logging_settings)


class AdminEmailHandler(logging.Handler):
    """An exception log handler that emails log entries to site admins.

    If the request is passed as the first argument to the log record,
    request data will be provided in the email report.
    """

    def __init__(self, include_html=False, email_backend=None):
        super().__init__()
        self.include_html = include_html
        self.email_backend = email_backend

    def emit(self, record):
        try:
            request = record.request
            subject = '%s (%s IP): %s' % (
                record.levelname,
                ('internal' if request.META.get('REMOTE_ADDR') in settings.INTERNAL_IPS
                 else 'EXTERNAL'),
                record.getMessage()
            )
        except Exception:
            subject = '%s: %s' % (
                record.levelname,
                record.getMessage()
            )
            request = None
        subject = self.format_subject(subject)

        # Since we add a nicely formatted traceback on our own, create a copy
        # of the log record without the exception data.
        no_exc_record = copy(record)
        no_exc_record.exc_info = None
        no_exc_record.exc_text = None

        if record.exc_info:
            exc_info = record.exc_info
        else:
            exc_info = (None, record.getMessage(), None)

        reporter = ExceptionReporter(request, is_email=True, *exc_info)
        message = "%s\n\n%s" % (self.format(no_exc_record), reporter.get_traceback_text())
        html_message = reporter.get_traceback_html() if self.include_html else None
        self.send_mail(subject, message, fail_silently=True, html_message=html_message)

    def send_mail(self, subject, message, *args, **kwargs):
        mail.mail_admins(subject, message, *args, connection=self.connection(), **kwargs)

    def connection(self):
        return get_connection(backend=self.email_backend, fail_silently=True)

    def format_subject(self, subject):
        """
        Escape CR and LF characters.
        """
        return subject.replace('\n', '\\n').replace('\r', '\\r')


class CallbackFilter(logging.Filter):
    """
    A logging filter that checks the return value of a given callable (which
    takes the record-to-be-logged as its only parameter) to decide whether to
    log a record.
    """

    def __init__(self, callback):
        self.callback = callback

    def filter(self, record):
        if self.callback(record):
            return 1
        return 0


class RequireDebugFalse(logging.Filter):
    def filter(self, record):
        return not settings.DEBUG


class RequireDebugTrue(logging.Filter):
    def filter(self, record):
        return settings.DEBUG


class ServerFormatter(logging.Formatter):
    def __init__(self, *args, **kwargs):
        self.style = color_style()
        super().__init__(*args, **kwargs)

    def format(self, record):
        msg = record.msg
        status_code = getattr(record, 'status_code', None)

        if status_code:
            if 200 <= status_code < 300:
                # Put 2XX first, since it should be the common case
                msg = self.style.HTTP_SUCCESS(msg)
            elif 100 <= status_code < 200:
                msg = self.style.HTTP_INFO(msg)
            elif status_code == 304:
                msg = self.style.HTTP_NOT_MODIFIED(msg)
            elif 300 <= status_code < 400:
                msg = self.style.HTTP_REDIRECT(msg)
            elif status_code == 404:
                msg = self.style.HTTP_NOT_FOUND(msg)
            elif 400 <= status_code < 500:
                msg = self.style.HTTP_BAD_REQUEST(msg)
            else:
                # Any 5XX, or any other status code
                msg = self.style.HTTP_SERVER_ERROR(msg)

        if self.uses_server_time() and not hasattr(record, 'server_time'):
            record.server_time = self.formatTime(record, self.datefmt)

        record.msg = msg
        return super().format(record)

    def uses_server_time(self):
        return self._fmt.find('{server_time}') >= 0


def log_response(message, *args, response=None, request=None, logger=request_logger, level=None, exc_info=None):
    """
    Log errors based on HttpResponse status.

    Log 5xx responses as errors and 4xx responses as warnings (unless a level
    is given as a keyword argument). The HttpResponse status_code and the
    request are passed to the logger's extra parameter.
    """
    # Check if the response has already been logged. Multiple requests to log
    # the same response can be received in some cases, e.g., when the
    # response is the result of an exception and is logged at the time the
    # exception is caught so that the exc_info can be recorded.
    if getattr(response, '_has_been_logged', False):
        return

    if level is None:
        if response.status_code >= 500:
            level = 'error'
        elif response.status_code >= 400:
            level = 'warning'
        else:
            level = 'info'

    getattr(logger, level)(
        message, *args,
        extra={
            'status_code': response.status_code,
            'request': request,
        },
        exc_info=exc_info,
    )
    response._has_been_logged = True


def _get_log_filename(model_or_instance):
    s = os.path.join(settings.HOME_DIR, 'orun', model_or_instance._meta.name)
    if not os.path.isdir(s):
        os.makedirs(s)
    if inspect.isclass(model_or_instance):
        return s
    return os.path.join(s, str(model_or_instance.pk) + '.log')


def log_file_to_dir(model_or_instance, data: bytes | str, prefix, filename=None):
    path = os.path.dirname(_get_log_filename(model_or_instance))
    if not inspect.isclass(model_or_instance):
        path = os.path.join(os.path.dirname(_get_log_filename(model_or_instance)), str(model_or_instance.pk))
    if filename is None:
        filename = os.path.join(path, f"{prefix}-{datetime.datetime.now().strftime('%y%m%d-%H%M%S-%f')}.xml")
    else:
        filename = os.path.join(path, filename)
    if not os.path.isdir(path):
        os.makedirs(path)
    if isinstance(data, str):
        data = data.encode('utf-8')
    with open(filename, 'wb') as f:
        f.write(data)
    return filename


def get_model_logger(model_or_instance, level=logging.INFO):
    _logger = logging.getLogger('model.activity.' + model_or_instance._meta.name)
    _logger.handlers = []
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler = logging.FileHandler(_get_log_filename(model_or_instance))
    handler.setFormatter(formatter)
    _logger.setLevel(level)
    _logger.addHandler(handler)
    return _logger
