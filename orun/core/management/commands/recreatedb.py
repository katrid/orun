from orun.db import DEFAULT_DB_ALIAS
from orun.core.management import commands
from orun.core.management.commands import createdb
from orun.core.management.commands import dropdb


@commands.command('recreatedb')
def command(database, **options):
    recreate(database)


def recreate(database=DEFAULT_DB_ALIAS):
    dropdb.drop(database)
    createdb.create(database)
