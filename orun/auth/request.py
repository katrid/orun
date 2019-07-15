from orun.conf import settings
from orun import auth
from orun import g, session
from orun.utils.functional import SimpleLazyObject


def auth_before_request():
    g.user_id = g.env.user_id = session.get(auth.AUTH_SESSION_KEY)
    g.user = g.env.user = SimpleLazyObject(lambda: auth.get_user(auth.AUTH_SESSION_KEY))
    g.site_user_id = session.get(auth.SITE_SESSION_KEY)
    g.site_user = SimpleLazyObject(lambda: auth.get_user(auth.SITE_SESSION_KEY, 'res.partner'))
    g.lang_code = settings.LANGUAGE_CODE
    session.permanent = True
