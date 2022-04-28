"""
Execute SQL File Script
"""
import os
from pathlib import Path

from orun.db import connections, DEFAULT_DB_ALIAS, connection
from orun.core.serializers import base


class Deserializer(base.Deserializer):
    """
    Execute a SQL File Script using the native command line interface
    """
    def deserialize(self):
        database = connections.databases[DEFAULT_DB_ALIAS]
        db_engine = self.connection.vendor
        user_name = database['USER']
        host = database['HOST']
        db_name = database['NAME']
        pwd = database['PASSWORD']
        filename = str(self.path)
        # filename = self.options['filename']
        if '%' in filename:
            self.stream_or_string = self.options['filename'] = filename = Path(filename % {'db_vendor': connection.vendor})
        else:
            filename = Path(filename)
        if db_engine == 'mssql':
            if user_name:
                additional_params = ''
                if os.name == 'nt':
                    additional_params = '-f 65001'
                    cmd = 'sqlcmd'
                else:
                    cmd = 'sqlcmd'
                shcmd = '%s -U %s -P "%s" -S %s -d %s -i "%s" %s' % (cmd, user_name, pwd, host, db_name, filename, additional_params)
                os.system(shcmd)
            else:
                os.system(
                    'sqlcmd -E -S %s -d %s -i "%s" -f 65001' %
                    (host, db_name, str(self.path),)
                )
        elif db_engine == 'postgresql':
            with self.connection.cursor() as cursor:
                sql = open(filename, 'r', encoding='utf-8').read()
                cursor.execute(sql)
        elif db_engine == 'sqlite':
            with self.connection.cursor() as cursor:
                sql = open(filename, 'r', encoding='utf-8').read()
                cursor.execute(sql)
