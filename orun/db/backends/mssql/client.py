import os
import signal
import subprocess

from orun.core.files.temp import NamedTemporaryFile
from orun.db.backends.base.client import BaseDatabaseClient


class DatabaseClient(BaseDatabaseClient):
    executable_name = 'sqlcmd'

    @classmethod
    def runshell_db(cls, conn_params):
        args = [cls.executable_name]

        host = conn_params.get('host', '')
        port = conn_params.get('port', '')
        dbname = conn_params.get('database', '')
        user = conn_params.get('user', '')
        passwd = conn_params.get('password', '')

        if user:
            args += ['-U', user]
        if passwd:
            args += ['-P', passwd]
        if host:
            args += ['-S', host]
        args += ['-d', dbname]

        sigint_handler = signal.getsignal(signal.SIGINT)
        try:
            signal.signal(signal.SIGINT, signal.SIG_IGN)
            subprocess.check_call(args)
        finally:
            # Restore the original SIGINT handler.
            signal.signal(signal.SIGINT, sigint_handler)

    def runshell(self):
        DatabaseClient.runshell_db(self.connection.get_connection_params())
