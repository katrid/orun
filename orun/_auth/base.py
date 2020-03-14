from functools import partial

from orun.apps import apps
from .anonymous import AnonymousUser

# Define session tokens
AUTH_SESSION_KEY = '_auth_user_id'
SITE_SESSION_KEY = '_site_user_id'
HASH_SESSION_KEY = '_auth_user_hash'
REDIRECT_FIELD_NAME = 'next'


def get_user_model(model_name='auth.user'):
    return apps[model_name]


def _get_user_session_key(request, session_key=AUTH_SESSION_KEY):
    # This value in the session is always serialized to a string, so we need
    # to convert it back to Python whenever we access it.
    return request.session[session_key]


def get_user_id(request, session_key=AUTH_SESSION_KEY):
    """
    Return the user id associated with the given request session.
    If no user is retrieved, return None.
    """
    return _get_user_session_key(request, session_key=session_key)


def get_user(request, session_key=AUTH_SESSION_KEY, model_name='auth.user'):
    model = get_user_model(model_name)
    user = None
    try:
        user_id = _get_user_session_key(request, session_key)
    except KeyError:
        pass
    else:
        user = model.objects.only('pk', 'name').get(pk=user_id)
    return user or AnonymousUser()


def authenticate(model_name='auth.user', **credentials):
    model = get_user_model(model_name)
    return model.authenticate(**credentials)


site_authenticate = partial(authenticate, model_name='res.partner')


def login(request, user, session_key=AUTH_SESSION_KEY):
    request.session[session_key] = user.id


site_login = partial(login, session_key=SITE_SESSION_KEY)


def logout(request, session_key=AUTH_SESSION_KEY):
    if session_key in request.session:
        del request.session[session_key]


site_logout = partial(logout, session_key=SITE_SESSION_KEY)
