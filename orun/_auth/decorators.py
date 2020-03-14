from datetime import timedelta
from functools import wraps, partial

from orun.urls import reverse
from orun.http import HttpResponseRedirect, HttpResponseForbidden
from orun.conf import settings
from orun.auth import AUTH_SESSION_KEY, SITE_SESSION_KEY
from orun.auth import REDIRECT_FIELD_NAME


def _login_required(fn=None, redirect_field_name=REDIRECT_FIELD_NAME, login_url=None, session_key=AUTH_SESSION_KEY):
    if callable(login_url):
        login_url = login_url()

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            from orun.conf import settings
            if settings.MULTI_DB and 'db' not in request.cookies:
                return HttpResponseRedirect(login_url if login_url else reverse('web.client.login'))

            user = request.session.get(session_key)
            # Disable decorator for testing framework
            if user:
                return view_func(request, *args, **kwargs)
            if request.is_json:
                return HttpResponseForbidden()
            return HttpResponseRedirect(login_url if login_url else reverse('web.client.login'))
        return wrapped

    if fn:
        return decorator(fn)
    return decorator


# API Login Required Decorator
login_required = partial(_login_required, login_url='WebClient:login')
# Basic Site Login Required Decorator
site_login_required = partial(
    _login_required, session_key=SITE_SESSION_KEY, login_url=lambda: settings['SITE_LOGIN_URL']
)
