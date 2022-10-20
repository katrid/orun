from orun.conf import settings
from orun.conf.urls.static import static
from orun.contrib.staticfiles.views import serve

urlpatterns = []


def staticfiles_urlpatterns(prefix=None):
    """
    Helper function to return a URL pattern for serving static files.
    """
    if prefix is None:
        prefix = settings.STATIC_URL
    return static(prefix, view=serve)


urlpatterns += staticfiles_urlpatterns()

