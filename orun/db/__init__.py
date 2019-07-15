from orun import app
from orun.core import signals
from .utils import (ConnectionHandler, DEFAULT_DB_ALIAS, DataError, Error, IntegrityError,
                    InterfaceError, InternalError, NotSupportedError, OperationalError, ProgrammingError, ConnectionRouter)


class Connections:
    def __getitem__(self, item):
        return app.connections[item]

    def __getattr__(self, item):
        return getattr(app.connections, item)


connections = Connections()

router = ConnectionRouter()


# `connection`, `DatabaseError` and `IntegrityError` are convenient aliases
# for backend bits.

# DatabaseWrapper.__init__() takes a dictionary, not a settings module, so we
# manually create the dictionary from the settings, passing only the settings
# that the database backends care about.
# We load all these up for backwards compatibility, you should use
# connections['default'] instead.
class DefaultConnectionProxy(object):
    """
    Proxy for accessing the default DatabaseWrapper object's attributes. If you
    need to access the DatabaseWrapper object itself, use
    connections[DEFAULT_DB_ALIAS] instead.
    """
    def __getattr__(self, item):
        return getattr(app.connections[DEFAULT_DB_ALIAS], item)

    def __setattr__(self, name, value):
        return setattr(app.connections[DEFAULT_DB_ALIAS], name, value)

    def __delattr__(self, name):
        return delattr(app.connections[DEFAULT_DB_ALIAS], name)

    def __eq__(self, other):
        return app.connections[DEFAULT_DB_ALIAS] == other

    def __ne__(self, other):
        return app.connections[DEFAULT_DB_ALIAS] != other

connection = DefaultConnectionProxy()


class DefaultSessionProxy(object):
    """
    Proxy for accessing the default DatabaseWrapper object's attributes. If you
    need to access the DatabaseWrapper object itself, use
    connections[DEFAULT_DB_ALIAS] instead.
    """
    def __getattr__(self, item):
        return getattr(connections[DEFAULT_DB_ALIAS].session, item)

    def __setattr__(self, name, value):
        return setattr(connections[DEFAULT_DB_ALIAS].session, name, value)

    def __delattr__(self, name):
        return delattr(connections[DEFAULT_DB_ALIAS].session, name)

    def __eq__(self, other):
        return connections[DEFAULT_DB_ALIAS].session == other

    def __ne__(self, other):
        return connections[DEFAULT_DB_ALIAS].session != other

session = DefaultSessionProxy()


# Register an event to reset saved queries when a Orun request is started.
# def reset_queries(*args, **kwargs):
#     for conn in connections.all():
#         pass
# #        conn.queries_log.clear()
# signals.request_started.connect(reset_queries)


# Register an event to reset transaction state and close connections past
# their lifetime.
def close_old_connections(*args, **kwargs):
    connections.close_all()


signals.request_started.connect(close_old_connections)
signals.request_finished.connect(close_old_connections)
