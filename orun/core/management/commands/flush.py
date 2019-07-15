import sys
from importlib import import_module
import click

from orun.utils import reraise
from orun.apps import apps
from orun.core.management.color import no_style
from orun.core.management.sql import emit_post_migrate_signal, sql_flush
from orun.db import DEFAULT_DB_ALIAS, connections #, transaction


@click.command('flush')
@click.option('--database', '-db')
@click.option('--verbosity', '-v')
@click.option('--interactive', '-i')
@click.option('--reset-sequences', '-r')
@click.option('--allow-cascade', '-c')
@click.option('--inhibit-post-migrate', '-ipm')
def command(self, database, verbosity, interactive, reset_sequences, allow_cascade, inhibit_post_migrate):
    connection = connections[database]

    self.style = no_style()

    # Import the 'management' module within each installed app, to register
    # dispatcher events.
    for app_config in apps.get_app_configs():
        try:
            import_module('.management', app_config.name)
        except ImportError:
            pass

    sql_list = sql_flush(self.style, connection, only_orun=True,
                         reset_sequences=reset_sequences,
                         allow_cascade=allow_cascade)

    if interactive:
        confirm = input("""You have requested a flush of the database.
This will IRREVERSIBLY DESTROY all data currently in the %r database,
and return each table to an empty state.
Are you sure you want to do this?

Type 'yes' to continue, or 'no' to cancel: """ % connection.settings_dict['NAME'])
    else:
        confirm = 'yes'

    if confirm == 'yes':
        try:
            with transaction.atomic(using=database,
                                    savepoint=connection.features.can_rollback_ddl):
                with connection.cursor() as cursor:
                    for sql in sql_list:
                        cursor.execute(sql)
        except Exception as e:
            new_msg = (
                "Database %s couldn't be flushed. Possible reasons:\n"
                "  * The database isn't running or isn't configured correctly.\n"
                "  * At least one of the expected database tables doesn't exist.\n"
                "  * The SQL was invalid.\n"
                "Hint: Look at the output of 'orun-admin sqlflush'. "
                "That's the SQL this command wasn't able to run.\n"
                "The full error: %s") % (connection.settings_dict['NAME'], e)
            reraise(click.UsageError, click.UsageError(new_msg), sys.exc_info()[2])

        # Empty sql_list may signify an empty database and post_migrate would then crash
        if sql_list and not inhibit_post_migrate:
            # Emit the post migrate signal. This allows individual applications to
            # respond as if the database had been migrated from scratch.
            emit_post_migrate_signal(verbosity, interactive, database)
    else:
        self.stdout.write("Flush cancelled.\n")
