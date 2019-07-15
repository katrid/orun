import os

from sqlalchemy.engine.url import make_url

from orun.core.management import commands
from orun.db import connections
from .createdb import _create_connection


@commands.command('dropdb')
def command(database, **options):
    drop(database)


def drop(db):
    db_settings = connections.databases[db]
    url = make_url(db_settings['ENGINE'])
    db_engine = url.drivername.split('+')[0]
    db_name = url.database

    if db_engine == 'sqlite' and db_name == ':memory:':
        return

    conn = _create_connection(url)
    commands.echo('Dropping db "%s"' % db_name)

    if db_engine == 'sqlite':
        del conn
        try:
            os.remove(db_name)
        except Exception as e:
            commands.echo(e, err=True)
    elif db_engine == 'postgresql':
        conn.connection.set_isolation_level(0)
        try:
            conn.execute('''SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '%s';''' % db_name)
            conn.execute('''DROP DATABASE "%s"''' % db_name)
        except Exception as e:
            commands.echo(e, err=True)
        conn.autocommit = False
    elif db_engine == 'mysql':
        try:
            conn.execute('''DROP DATABASE IF EXISTS %s''' % db_name)
        except Exception as e:
            commands.echo(e, err=True)
    elif db_engine == 'mssql':
        try:
            conn.execute('''DROP DATABASE [%s]''' % db_name)
        except Exception as e:
            commands.echo(e, err=True)
        conn.autocommit = False
    elif db_engine == 'oracle':
        try:
            conn.execute('DROP USER usr_%s CASCADE' % db)
        except Exception as e:
            commands.echo(e, err=True)

    commands.echo('Database "%s" has been dropped successfully' % db_name)
