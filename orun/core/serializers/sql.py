"""
Execute SQL File Script
"""
import os
from sqlalchemy.engine.url import make_url

from orun.db import connections, DEFAULT_DB_ALIAS, connection
from orun.core.serializers import base


class Deserializer(base.Deserializer):
    """
    Execute a SQL File Script using the native command line interface
    """
    def from_file(self, filename: str, encoding: str='utf-8'):
        database = connections.databases[DEFAULT_DB_ALIAS]
        url = make_url(database['ENGINE'])
        db_engine = url.drivername.split('+')[0]
        user_name = url.username
        host = url.host
        db_name = url.database
        pwd = url.password
        # detect specific version of sql file
        db_filename = f'%s.{db_engine}.sql' % filename.rsplit('.', 1)[0]
        if os.path.isfile(db_filename):
            filename = db_filename
        if db_engine == 'mssql':
            if user_name:
                additional_params = ''
                if os.name == 'nt':
                    additional_params = '-f 65001'
                    cmd = 'sqlcmd'
                else:
                    cmd = '/opt/mssql-tools/bin/sqlcmd'
                os.system(
                    '%s -U %s -P %s -S %s -d %s -i "%s" %s' %
                    (cmd, user_name, pwd, host, db_name, filename, additional_params)
                )
            else:
                os.system(
                    'sqlcmd -E -S %s -d %s -i "%s" -f 65001' %
                    (host, db_name, filename,)
                )
        elif db_engine == 'postgresql':
            conn = connection.engine.raw_connection()
            with conn.cursor() as cur:
                sql = open(filename, 'r', encoding='utf-8').read()
                cur.execute(sql)
                conn.commit()
