import sqlalchemy as sa
from sqlalchemy import Table, Column, Integer, String, DateTime, MetaData, PrimaryKeyConstraint

from orun.db.utils import DatabaseError
from orun.utils.timezone import now


class MigrationRecorder(object):
    """
    Deals with storing migration records in the database.

    Because this table is actually itself used for dealing with model
    creation, it's the one thing we can't do normally via migrations.
    We manually handle table creation/schema updating (using schema backend)
    and then have a floating model to do queries with.

    If a migration is unapplied its row is removed from the table. Having
    a row in the table always means a migration is applied.
    """

    migration_metadata = MetaData()

    Migration = None

    def __init__(self, connection):
        self.connection = connection

    @property
    def migration_qs(self):
        return self.connection.execute(self.Migration.select()).fetchall()

    def ensure_schema(self):
        """
        Ensures the table exists and has the correct schema.
        """
        if self.Migration is None:
            pk_type = Integer

            if self.connection.engine.name == 'oracle':
                import orun.db.backends.oracle.fields
                pk_type = orun.db.backends.oracle.fields.Identity()

            MigrationRecorder.Migration = Table(
                'ir_migration', self.migration_metadata,
                Column('id', pk_type, primary_key=True),
                Column('app', String(255), nullable=False),
                Column('name', String(255), nullable=False),
                Column('applied', DateTime, default=now),
                PrimaryKeyConstraint('id', name='pk_sys_migration')
            )

        # If the table's there, that's fine - we've never changed its schema
        # in the codebase.
        insp = sa.inspect(self.connection)
        if self.Migration.name in insp.get_table_names():
            return
        insp.info_cache['migration created'] = True
        #if self.Migration._meta.db_table in self.connection.introspection.table_names(self.connection.cursor()):
        #    return
        # Make the table
        try:
            self.Migration.create(self.connection)
        except DatabaseError as exc:
            pass

    def applied_migrations(self):
        """
        Returns a set of (app, name) of applied migrations.
        """
        self.ensure_schema()
        return set((x['app'], x['name']) for x in self.migration_qs)

    def record_applied(self, app, name):
        """
        Records that a migration was applied.
        """
        self.ensure_schema()
        self.connection.execute(self.Migration.insert().values(app=app, name=name))

    def record_unapplied(self, app, name):
        """
        Records that a migration was unapplied.
        """
        self.ensure_schema()
        self.migration_qs.filter(app=app, name=name).delete()

    def flush(self):
        """
        Deletes all migration records. Useful if you're testing migrations.
        """
        self.migration_qs.all().delete()
