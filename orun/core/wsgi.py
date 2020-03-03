import orun
from orun.core.handlers.wsgi import WSGIHandler


def get_wsgi_application():
    """
    The public interface to Orun's WSGI support. Return a WSGI callable.

    Avoids making orun.core.handlers.WSGIHandler a public API, in case the
    internal WSGI implementation changes or moves in the future.
    """
    orun.setup(set_prefix=False)
    return WSGIHandler()
