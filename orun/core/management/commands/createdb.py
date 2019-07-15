from sqlalchemy import create_engine
from sqlalchemy.engine.url import URL, make_url

from orun.core.management import commands
from orun.db import connections, DEFAULT_DB_ALIAS


@commands.command('createdb')
@commands.argument(
    'database', nargs=1,
)
def command(database, **options):
    create(database)


def _create_connection(db):
    if isinstance(db, str):
        url = make_url(connections.databases[DEFAULT_DB_ALIAS]['ENGINE'])
    elif isinstance(db, dict):
        url = make_url(db['ENGINE'])
    else:
        url = db

    db_engine = url.drivername.split('+')[0]
    database = url.database
    kwargs = {'autocommit': True}

    if db_engine == 'sqlite':
        return
    elif db_engine == 'postgresql':
        database = 'postgres'
    elif db_engine == 'mssql':
        kwargs['isolation_level'] = 'AUTOCOMMIT'
        database = 'master'
    elif db_engine == 'mysql':
        database = None
    elif db_engine == 'oracle':
        database = connections.databases[DEFAULT_DB_ALIAS].get('SYSTEM_DB', 'SYSTEM')

    url = URL(url.drivername, url.username, url.password, url.host, url.port, database, url.query)
    return create_engine(url).connect().execution_options(**kwargs)


def create(db):
    commands.echo('Creating database "%s"' % db)
    db_info = connections.databases[DEFAULT_DB_ALIAS]
    url = make_url(db_info['ENGINE'])

    # sqlite create database bug fix
    if url.drivername == 'sqlite':
        if url.database != ':memory:' and url.database is not None:
            import sqlite3
            sqlite3.connect(url.database)
        return

    conn = _create_connection(url)

    db_settings = conn.engine.url
    db_engine = conn.engine.name

    if 'postgresql' == db_engine:
        conn.connection.set_isolation_level(0)
        conn.execute("""CREATE DATABASE "%s" ENCODING='UTF-8'""" % db)
    elif 'mysql' == db_engine:
        conn.execute("""CREATE DATABASE %s""" % db)
    elif db_engine == 'mssql':
        conn.detach()
        conn.execute("""CREATE DATABASE [%s]""" % db)
    elif db_engine == 'oracle':
        conn.execute('create user usr_%s identified by %s' % (db_settings.username, db_settings.password))
        conn.commit()
        conn.execute('grant all privilege to usr_%s' % db_settings.username)

    commands.echo('Database "%s" has been created succesfully' % db)
