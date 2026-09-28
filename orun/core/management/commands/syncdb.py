import traceback
from collections import OrderedDict
from importlib import import_module
import logging

from orun.apps import apps
from orun.core.checks import Tags, run_checks
from orun.core.management.base import (
    BaseCommand, CommandError, no_translations,
)
from orun.core.management.sql import (
    emit_post_migrate_signal, emit_pre_migrate_signal, register_models,
)
from orun.db import DEFAULT_DB_ALIAS, connections, router
from orun.utils.module_loading import module_has_submodule
from orun.db.backends.base.base import BaseDatabaseWrapper
from orun.db.migrations.operations.base import Operation

logger = logging.getLogger('orun.db.backends')


class Command(BaseCommand):
    help = "Updates database schema."

    def add_arguments(self, parser):
        parser.add_argument(
            'schema', nargs='?',
            help='Schema of an application to synchronize the state.',
        )
        parser.add_argument(
            '--noinput', '--no-input', action='store_false', dest='interactive',
            help='Tells Orun to NOT prompt the user for input of any kind.',
        )
        parser.add_argument(
            '--database',
            default=DEFAULT_DB_ALIAS,
            help='Nominates a database to synchronize. Defaults to the "default" database.',
        )
        parser.add_argument(
            '--noddl', '--no-ddl', action='store_true',
            help='Sync database structure without additional DDL objects',
        )
        parser.add_argument(
            '--check', action='store_true',
            help='Check for pending migrations without making any changes to the database.',
        )
        parser.add_argument(
            '--format', default='json',
            help='Specify the output format when using --check. Supported formats: json, yaml, text (default: json).',
        )
        parser.add_argument(
            '--fake', action='store_true',
            help='Mark migrations as run without actually running them.',
        )
        parser.add_argument(
            '--fake-initial', action='store_true',
            help='Detect if tables already exist and fake-apply initial migrations if so. Make sure '
                 'that the current database schema matches your initial migration before using this '
                 'flag. Orun will only check for an existing table name.',
        )
        parser.add_argument(
            '--register-models', action='store_true',
        )

    def _run_checks(self, **kwargs):
        issues = run_checks(tags=[Tags.database])
        issues.extend(super()._run_checks(**kwargs))
        return issues

    @no_translations
    def handle(self, *args, **options):
        self.verbosity = options['verbosity']
        self.interactive = options['interactive']
        self.no_ddl = options['noddl']
        self.check_only = options['check']

        reg_models = options['register_models']
        if reg_models:
            return register_models(list(apps.models.values()))

        # Import the 'management' module within each installed app, to register
        # dispatcher events.
        for app_config in apps.get_app_configs():
            if module_has_submodule(app_config.module, "management"):
                import_module('.management', app_config.name)

        # Get the database we're operating from
        db = options['database']
        connection = connections[db]

        # Hook for backends needing any database preparation
        connection.prepare_database()

        # If they supplied command line arguments, work out what they mean.
        target_app_labels_only = True
        if options['schema']:
            # Validate app_label.
            app_label = options['schema']
            try:
                apps.get_addon(app_label)
            except LookupError as err:
                raise CommandError(str(err))

        # At this point, ignore run_syncdb if there aren't any apps to sync.
        # Print some useful info
        if self.verbosity >= 1:
            self.stdout.write(self.style.MIGRATE_HEADING("Operations to perform:"))
            if options['schema']:
                self.stdout.write(
                    self.style.MIGRATE_LABEL("  Synchronize app: %s" % app_label)
                )
            else:
                self.stdout.write(
                    self.style.MIGRATE_LABEL("  Synchronize apps: ") +
                    (", ".join(sorted(apps.addons.keys())))
                )

        # emit_pre_migrate_signal(
        #     self.verbosity, self.interactive, connection.alias, apps=pre_migrate_apps, plan=plan,
        # )

        try:
            self.sync_database(connection)
        except Exception as e:
            logger.exception("Error during syncdb operation")
            raise

    def sync_database(self, connection: BaseDatabaseWrapper):
        """Sync database schema for all apps."""
        with connection.cursor() as cursor:
            schemas = connection.introspection.schema_names(cursor) or []
            tables = connection.introspection.table_names(cursor)
            if 'orun_metadata' not in tables:
                connection.introspection.create_metadata_table(cursor)

        with connection.schema_editor() as editor:
            editor.load_metadata()
            self.stdout.write("Checking schemas...\n")
            for app_name, app in apps.addons.items():
                if connection.features.schemas_allowed and app.db_schema and app.create_schema and app.db_schema not in schemas:
                    self.stdout.write(f"Creating schema {app.db_schema}...\n")
                    editor.create_schema(app.db_schema)
            # create all tables before additional objects
            created_models = []
            self.stdout.write("Collecting changes...\n")
            changes = list(editor.collect_changes())
            for change in changes:
                if isinstance(change, Operation):
                    if not change.postpone:
                        change.apply(editor)
                elif isinstance(change, tuple):
                    meth, args = change
                    if meth == editor.create_table:
                        created_models.append(apps.models[args[0].model])
                    meth(*args)
            if changes:
                editor.save_metadata()
                # emit post migrate signal
                emit_post_migrate_signal(self.verbosity, self.interactive, connection.alias, created_models=created_models)

        postponed_changes = [c for c in changes if isinstance(c, Operation) and c.postpone]
        if postponed_changes:
            self.stdout.write("Running deferred operations...\n")
            with connection.schema_editor(atomic=False) as editor:
                for change in postponed_changes:
                    try:
                        # self.stdout.write(change.describe() + "...\n")
                        change.apply(editor)
                    except Exception as e:
                        traceback.print_exc()
        return len(changes)
