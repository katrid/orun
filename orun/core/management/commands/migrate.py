import time

import sqlalchemy as sa
from sqlalchemy.engine.url import make_url
from sqlalchemy.engine import reflection
from sqlalchemy.schema import CreateSchema

from orun import app as main_app
from orun.apps import apps
from orun.core.management import commands
from orun.core.management.commands import CommandError
# from orun.db import router
from orun.core.management.sql import (
    emit_post_migrate_signal, emit_pre_migrate_signal,
)
from orun.db import connections, DEFAULT_DB_ALIAS
from orun.db.migrations.autodetector import MigrationAutodetector
from orun.db.migrations.exceptions import AmbiguityError
from orun.db.migrations.executor import MigrationExecutor
from orun.db.migrations.state import ProjectState


@commands.command('migrate', short_help="Updates database schema. Manages both apps with migrations and those without.")
@commands.argument(
    'app_label', nargs=1, required=False,
    #help='App label of an addon to synchronize the state.',
)
@commands.argument(
    'migration_name', nargs=1, required=False,
    #help='Database state will be brought to the state after that '
    #     'migration. Use the name "zero" to unapply all migrations.',
)
@commands.option(
    '--noinput', default=True,
    help='Tells Orun to NOT prompt the user for input of any kind.',
)
@commands.option(
    '--fake',
    help='Mark migrations as run without actually running them.',
)
@commands.option(
    '--fake-initial',
    help='Detect if tables already exist and fake-apply initial migrations if so. Make sure '
         'that the current database schema matches your initial migration before using this '
         'flag. Orun will only check for an existing table name.',
)
@commands.option(
    '--sync', is_flag=True,
    help='Creates tables for apps without migrations.',
)
def command(app_label, migration_name, noinput, database, fake, fake_initial, sync, **options):
    migrate(app_label, migration_name, noinput, database, fake, fake_initial, sync, **options)


def migrate(app_label=None, migration_name=None, noinput=True, database=None, fake=None, fake_initial=None, sync=None, **options):
    migrate = Migrate(app_label, migration_name, noinput, database, fake, fake_initial, sync, **options)
    migrate.handle()


class Migrate(object):
    def __init__(self, app_label, migration_name, noinput, database, fake, fake_initial, sync, **options):
        self.app_label = app_label
        self.migration_name = migration_name
        self.interactive = not noinput
        self.database = database
        self.fake = fake
        self.fake_initial = fake_initial
        self.sync = sync
        self.verbosity = options['verbosity']

    def handle(self, *args, **options):
        # Get the database we're operating from
        if self.database:
            url = main_app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE']
            url = make_url(url)
            url.database = self.database
            main_app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'] = str(url)
        connection = connections[DEFAULT_DB_ALIAS]

        return self.sync_apps(connection, None)

        # Hook for backends needing any database preparation
        #connection.prepare_database()
        # Work out which apps have migrations and which do not
        executor = MigrationExecutor(connection, self.migration_progress_callback)

        # Before anything else, see if there's conflicting apps and drop out
        # hard if there are any
        conflicts = executor.loader.detect_conflicts()
        if conflicts:
            name_str = "; ".join(
                "%s in %s" % (", ".join(names), app)
                for app, names in conflicts.items()
            )
            raise CommandError(
                "Conflicting migrations detected; multiple leaf nodes in the "
                "migration graph: (%s).\nTo fix them run "
                "'python manage.py makemigrations --merge'" % name_str
            )

        # If they supplied command line arguments, work out what they mean.
        target_app_labels_only = True
        if self.app_label and self.migration_name:
            app_label, migration_name = self.app_label, self.migration_name
            if app_label not in executor.loader.migrated_apps:
                raise CommandError(
                    "App '%s' does not have migrations." % app_label
                )
            if migration_name == "zero":
                targets = [(app_label, None)]
            else:
                try:
                    migration = executor.loader.get_migration_by_prefix(app_label, migration_name)
                except AmbiguityError:
                    raise CommandError(
                        "More than one migration matches '%s' in app '%s'. "
                        "Please be more specific." %
                        (migration_name, app_label)
                    )
                except KeyError:
                    raise CommandError("Cannot find a migration matching '%s' from app '%s'." % (
                        migration_name, app_label))
                targets = [(app_label, migration.name)]
            target_app_labels_only = False
        elif self.app_label:
            app_label = self.app_label
            if app_label not in executor.loader.migrated_apps:
                raise CommandError(
                    "App '%s' does not have migrations." % app_label
                )
            targets = [key for key in executor.loader.graph.leaf_nodes() if key[0] == app_label]
        else:
            targets = executor.loader.graph.leaf_nodes()

        plan = executor.migration_plan(targets)
        run_syncdb = self.run_syncdb and executor.loader.unmigrated_apps

        # Print some useful info
        if self.verbosity >= 1:
            commands.echo(commands.style.MIGRATE_HEADING("Operations to perform:"))
            if run_syncdb:
                commands.echo(
                    commands.style.MIGRATE_LABEL("  Synchronize unmigrated apps: ") +
                    (", ".join(executor.loader.unmigrated_apps))
                )
            if target_app_labels_only:
                commands.echo(
                    commands.style.MIGRATE_LABEL("  Apply all migrations: ") +
                    (", ".join(set(a for a, n in targets)) or "(none)")
                )
            else:
                if targets[0][1] is None:
                    commands.echo(commands.style.MIGRATE_LABEL(
                        "  Unapply all migrations: ") + "%s" % (targets[0][0], )
                    )
                else:
                    commands.echo(commands.style.MIGRATE_LABEL(
                        "  Target specific migration: ") + "%s, from %s"
                        % (targets[0][1], targets[0][0])
                    )

        emit_pre_migrate_signal(self.verbosity, self.interactive, db)

        # Run the syncdb phase.
        if run_syncdb:
            if self.verbosity >= 1:
                commands.echo(commands.style.MIGRATE_HEADING("Synchronizing apps without migrations:"))
            self.sync_apps(connection, executor.loader.unmigrated_apps)

        # Migrate!
        if self.verbosity >= 1:
            commands.echo(commands.style.MIGRATE_HEADING("Running migrations:"))
        if not plan:
            executor.check_replacements()
            if self.verbosity >= 1:
                commands.echo("  No migrations to apply.")
                # If there's changes that aren't in migrations yet, tell them how to fix it.
                autodetector = MigrationAutodetector(
                    executor.loader.project_state(),
                    ProjectState.from_apps(apps),
                )
                changes = autodetector.changes(graph=executor.loader.graph)
                if changes:
                    commands.echo(commands.style.NOTICE(
                        "  Your models have changes that are not yet reflected "
                        "in a migration, and so won't be applied."
                    ))
                    commands.echo(commands.style.NOTICE(
                        "  Run 'manage.py makemigrations' to make new "
                        "migrations, and then re-run 'manage.py migrate' to "
                        "apply them."
                    ))
        else:
            fake = self.fake
            fake_initial = self.fake_initial
            executor.migrate(targets, plan, fake=fake, fake_initial=fake_initial)

        # Send the post_migrate signal, so individual apps can do whatever they need
        # to do at this point.
        emit_post_migrate_signal(self.verbosity, self.interactive, connection.alias)

        # Register models
        ContentType = main_app['ir.model']
        for model in apps.get_models():
            content_types = {
                ct.name: ct
                for ct in ContentType.objects.all()
            }
            to_remove = [
                ct
                for (model_name, ct) in content_types.items()
                if model_name not in main_app.models
            ]

            cts = [
                {'name': model_name, 'object_name': model._meta.object_name, 'object_type': 'system'}
                for (model_name, model) in main_app.models.items()
                if model_name not in content_types
            ]
            if cts:
                # TODO optimize it for oracle and mysql database
                for ct in cts:
                    ContentType.insert.values(ct)

    def migration_progress_callback(self, action, migration=None, fake=False):
        if self.verbosity >= 1:
            compute_time = self.verbosity > 1
            if action == "apply_start":
                if compute_time:
                    self.start = time.time()
                commands.echo("  Applying %s..." % migration, nl=False)
            elif action == "apply_success":
                elapsed = " (%.3fs)" % (time.time() - self.start) if compute_time else ""
                if fake:
                    commands.echo(commands.style.MIGRATE_SUCCESS(" FAKED" + elapsed))
                else:
                    commands.echo(commands.style.MIGRATE_SUCCESS(" OK" + elapsed))
            elif action == "unapply_start":
                if compute_time:
                    self.start = time.time()
                commands.echo("  Unapplying %s..." % migration, nl=False)
            elif action == "unapply_success":
                elapsed = " (%.3fs)" % (time.time() - self.start) if compute_time else ""
                if fake:
                    commands.echo(commands.style.MIGRATE_SUCCESS(" FAKED" + elapsed))
                else:
                    commands.echo(commands.style.MIGRATE_SUCCESS(" OK" + elapsed))
            elif action == "render_start":
                if compute_time:
                    self.start = time.time()
                commands.echo("  Rendering model states...", nl=False)
            elif action == "render_success":
                elapsed = " (%.3fs)" % (time.time() - self.start) if compute_time else ""
                commands.echo(commands.style.MIGRATE_SUCCESS(" DONE" + elapsed))

    def sync_apps(self, connection, app_labels):
        "Compares all database tables and synchronize ir if needed."
        insp = reflection.Inspector.from_engine(connection.engine)
        for app in main_app.addons.values():
            if app.db_schema:
                try:
                    connection.engine.execute(CreateSchema(app.db_schema))
                except:
                    pass

        tables = [
            table
            for table in main_app.meta.tables.values()
            if connection.engine.dialect.has_table(connection.engine, table.name, schema=table.schema) and table.__model__._meta.managed
        ]

        main_app.meta.create_all(connection.engine, tables=[tbl for tbl in main_app.meta.tables.values() if tbl.__model__._meta.managed])
        meta = sa.MetaData(connection.engine)

        for table in tables:
            model = table.__model__
            cols = insp.get_columns(table.name, schema=table.schema)
            cols = {col['name']: col for col in cols}
            tbl = sa.Table(
                table.name, meta, schema=table.schema, autoload=True,
            )
            indexes = None
            with connection.schema_editor() as editor:
                if editor.connection.engine.name == 'sqlite':
                    return
                for f in model._meta.local_fields:
                    if f.column is None:
                        continue
                    c = f.column
                    old_col = tbl.c.get(c.name)
                    if old_col is None:
                        if c.name not in cols:
                            # connection.execute(CreateColumn(c))
                            print(f'Add new field {f.name} at model {model._meta.name}')
                            editor.add_field(model, f)
                    elif f.db_compute and not old_col.info.get('compute'):
                        editor.safe_alter_column(c, old_col, indexes=indexes)
                        editor.add_field(model, f)
                    elif not editor.connection.data_type_eq(str(old_col.type), str(c.type)):
                        print(f'Field {f.name} at model {model._meta.name} has changed, from "{old_col.type}" to "{c.type}"')
                        editor.safe_alter_column(c, old_col, indexes=indexes)
                        editor.add_field(model, f)
                    elif old_col.foreign_keys and not editor.compare_fks(old_col.foreign_keys, c.foreign_keys):
                        # if indexes is None:
                        #     indexes = insp.get_indexes(tbl.name, tbl.schema)
                        editor.safe_alter_column(c, old_col, indexes=indexes)
                        editor.add_field(model, f)
                    elif c.nullable != old_col.nullable and c.nullable:
                        editor.alter_column_null(c)

