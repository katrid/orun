import asyncio
from contextvars import ContextVar
from . import connections, DEFAULT_DB_ALIAS
from .utils import ConnectionHandler, load_backend
from orun.apps import apps


class Connection:
    connections: ConnectionHandler = connections
    db_connections = ContextVar('db_connections', default={})
    connection = None

    def __init__(self, alias: str):
        self.alias = alias

    def _connect(self):
        if self.connection is None:
            self.connection = self.connections.new_connection(self.alias)
        return self.connection

    def _enter(self):
        # Set the current connection in the context variable
        self._token = self.db_connections.set({**self.db_connections.get(), self.alias: self.connection})

    def _exit(self):
        # Reset the context variable to its previous state
        self.db_connections.reset(self._token)

    def __enter__(self):
        self._connect()
        self._enter()
        return self

    async def __aenter__(self):
        await asyncio.to_thread(self._connect)
        self._enter()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._exit()
        self.connection.close()

    async def __aexit__(self, exc_type, exc_value, traceback):
        await asyncio.to_thread(self.connection.close)
        self._exit()

    @classmethod
    def get_connection(cls, alias: str):
        return cls.db_connections.get().get(alias)


def connect(alias: str = DEFAULT_DB_ALIAS):
    """
    Establish a connection to the specified database and set it as the current context. This function is used to manage multiple database connections in a thread-safe manner.
    :param alias: database alias to connect to
    :return:
    """
    return Connection(alias)
