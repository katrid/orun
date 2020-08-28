from orun.contrib.sessions.base_session import (
    AbstractBaseSession, BaseSessionManager,
)


class SessionManager(BaseSessionManager):
    use_in_migrations = True


class Session(AbstractBaseSession):
    """
    Orun provides full support for anonymous sessions. The session
    framework lets you store and retrieve arbitrary data on a
    per-site-visitor basis. It stores data on the server side and
    abstracts the sending and receiving of cookies. Cookies contain a
    session ID -- not the data itself.

    The Orun sessions framework is entirely cookie-based. It does
    not fall back to putting session IDs in URLs. This is an intentional
    design decision. Not only does that behavior make URLs ugly, it makes
    your site vulnerable to session-ID theft via the "Referer" header.

    For complete documentation on using Sessions in your code, consult
    the sessions documentation that is shipped with Orun (also available
    on the Orun Web site).
    """
    objects = SessionManager()

    @classmethod
    def get_session_store_class(cls):
        from orun.contrib.sessions.backends.db import SessionStore
        return SessionStore

    class Meta:
        name = 'ir.session'
