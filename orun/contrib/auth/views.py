from urllib.parse import urlsplit, urlunsplit

from orun.conf import settings
from orun.apps import apps
from orun.contrib.auth import REDIRECT_FIELD_NAME
from orun.core.exceptions import ImproperlyConfigured
from orun.http import HttpResponseRedirect, QueryDict
from orun.shortcuts import resolve_url
from orun.utils.http import url_has_allowed_host_and_scheme

UserModel = apps.models['auth.user']


class RedirectURLMixin:
    next_page = None
    redirect_field_name = REDIRECT_FIELD_NAME
    success_url_allowed_hosts = set()

    def get_success_url(self):
        return self.get_redirect_url() or self.get_default_redirect_url()

    def get_redirect_url(self):
        """Return the user-originating redirect URL if it's safe."""
        redirect_to = self.request.POST.get(
            self.redirect_field_name, self.request.GET.get(self.redirect_field_name)
        )
        url_is_safe = url_has_allowed_host_and_scheme(
            url=redirect_to,
            allowed_hosts=self.get_success_url_allowed_hosts(),
            require_https=self.request.is_secure(),
        )
        return redirect_to if url_is_safe else ""

    def get_success_url_allowed_hosts(self):
        return {self.request.get_host(), *self.success_url_allowed_hosts}

    def get_default_redirect_url(self):
        """Return the default redirect URL."""
        if self.next_page:
            return resolve_url(self.next_page)
        raise ImproperlyConfigured("No URL to redirect to. Provide a next_page.")


def redirect_to_login(next, login_url=None, redirect_field_name=REDIRECT_FIELD_NAME):
    """
    Redirect the user to the login page, passing the given 'next' page.
    """
    resolved_url = resolve_url(login_url or settings.LOGIN_URL)

    login_url_parts = list(urlsplit(resolved_url))
    if redirect_field_name:
        querystring = QueryDict(login_url_parts[3], mutable=True)
        querystring[redirect_field_name] = next
        login_url_parts[3] = querystring.urlencode(safe="/")

    return HttpResponseRedirect(urlunsplit(login_url_parts))

