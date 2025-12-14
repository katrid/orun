import os
import time
from collections import OrderedDict
from importlib import import_module
import logging

from orun.apps import apps
from orun.core.checks import Tags, run_checks
from orun.core.management.base import (
    BaseCommand, CommandError, no_translations,
)
from orun.core.management.sql import (
    emit_post_migrate_signal, emit_pre_migrate_signal,
)
from orun.db import DEFAULT_DB_ALIAS, connections, router
from orun.utils.module_loading import module_has_submodule
from orun.db.backends.base.base import BaseDatabaseWrapper

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

    def __sync_apps(self, connection: BaseDatabaseWrapper, app_labels):
        """Run the old syncdb-style operation on a list of app_labels."""
        with connection.cursor() as cursor:
            schemas = connection.introspection.schema_names(cursor) or []
            tables = connection.introspection.table_names(cursor)
            if 'orun_metadata' not in tables:
                connection.introspection.create_metadata_table(cursor)

        # Build the manifest of apps and models that are to be synchronized.
        all_models = [
            (
                app_config.name,
                router.get_migratable_models(app_config, connection.alias, include_auto_created=False),
            )
            for app_config in apps.get_app_configs()
            if app_config.models_module is not None and app_config.name in app_labels
        ]

        manifest = OrderedDict(
            # (app_name, list(filter(model_installed, model_list)))
            (app_name, model_list)
            for app_name, model_list in all_models
        )

        # Create the tables for each model
        if self.verbosity >= 1:
            self.stdout.write("  Creating tables...\n")
        post_model_list = {}
        with connection.schema_editor() as editor:
            editor.load_metadata()
            for app_name in manifest:
                app = apps.app_configs[app_name]
                if connection.features.schemas_allowed and app.db_schema and app.create_schema and app.db_schema not in schemas:
                    editor.create_schema(app.db_schema)
            # create all tables before additional objects
            created_models = []
            for app_name, model_list in manifest.items():
                for model in model_list:
                    # Never install unmanaged models, etc.
                    if not model._meta.can_migrate(connection):
                        continue

                    # Check if table exists on database
                    if editor.table_exists(tables, model):
                        continue

                    if self.verbosity >= 3:
                        self.stdout.write(
                            "    Processing %s.%s model\n" % (app_name, model._meta.object_name)
                        )
                    if self.verbosity >= 1:
                        self.stdout.write("    Creating table %s\n" % model._meta.db_table)
                    editor.create_model(model)
                    created_models.append(model)
                post_model_list[app_name] = model_list

            # Deferred SQL is executed when exiting the editor's context.
            if self.verbosity >= 1:
                self.stdout.write("    Running deferred SQL...\n")
            # Check by additional sql objects
            for app_name, model_list in post_model_list.items():
                for model in model_list:
                    if model._meta.can_migrate(connection) and model not in created_models:
                        editor.sync_model(model)

            # sync DDL statements on models
            if not self.no_ddl:
                for app_name, model_list in post_model_list.items():
                    for model in model_list:
                        editor.sync_model_ddl(model)

            editor.save_metadata()

            # emit post migrate signal
            emit_post_migrate_signal(
                self.verbosity, self.interactive, connection.alias, app_models=post_model_list.items()
            )

    def sync_database(self, connection: BaseDatabaseWrapper):
        """Sync database schema for all apps."""
        with connection.cursor() as cursor:
            schemas = connection.introspection.schema_names(cursor) or []
            # tables = connection.introspection.table_names(cursor)

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
            change_count = 0
            for meth, args in editor.collect_changes():
                change_count += 1
                if meth == editor.create_table:
                    created_models.append(args[0].model)
                meth(*args)
            if change_count > 0:
                editor.save_metadata()
                # emit post migrate signal
                emit_post_migrate_signal(self.verbosity, self.interactive, connection.alias, created_models=created_models)
            return change_count
