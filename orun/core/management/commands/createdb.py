from orun.core.management.base import BaseCommand
from orun.conf import settings
from orun.db import DEFAULT_DB_ALIAS, connection


class Command(BaseCommand):
    help = "Updates database schema."

    def add_arguments(self, parser):
        parser.add_argument('database', help='Database name to create.')

    def create(self, db):
        self.stdout.write('Creating database "%s"' % db)
        if connection.vendor == 'sqlite':
            schema = connection.schema_editor()
        else:
            no_conn = connection._nodb_connection
            schema = no_conn.schema_editor()
        schema.create_database(db)
        connection.schema_editor().post_create_database()
        self.stdout.write('Database "%s" has been created successfully' % db)

    def handle(self, *args, **options):
        self.create(options['database'])
