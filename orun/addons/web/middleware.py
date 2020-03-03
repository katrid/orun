from orun.conf import settings
from orun import auth
from orun.utils.deprecation import MiddlewareMixin
from orun.utils.functional import SimpleLazyObject


def get_user_id(request):
    if not hasattr(request, '_cached_user_id'):
        request._cached_user = auth.get_user_id(request)
    return request._cached_user


def get_user(request):
    if not hasattr(request, '_cached_user'):
        request._cached_user = auth.get_user(request)
    return request._cached_user


class AuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        assert hasattr(request, 'session'), (
            "The Orun authentication middleware requires session middleware "
            "to be installed. Edit your MIDDLEWARE%s setting to insert "
            "'orun.contrib.sessions.middleware.SessionMiddleware' before "
            "'orun.contrib.auth.middleware.AuthenticationMiddleware'."
        ) % ("_CLASSES" if settings.MIDDLEWARE is None else "")
        request.user_id = SimpleLazyObject(lambda: get_user_id(request))
        request.user = SimpleLazyObject(lambda: get_user(request))

