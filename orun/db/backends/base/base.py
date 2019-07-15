import sqlalchemy as sa
from sqlalchemy.engine.url import make_url

from orun.conf import settings
from orun.db.backends.base.schema import BaseDatabaseSchemaEditor
from orun.db.backends.base.operations import BaseDatabaseOperations


class BaseDatabaseWrapper:
    SchemaEditorClass = BaseDatabaseSchemaEditor
    creation_class = None
    features_class = None
    ops_class = BaseDatabaseOperations

    def __init__(self, url, alias, settings_dict, **kwargs):
        self.engine = sa.create_engine(str(url), echo=settings.SQL_DEBUG, **kwargs)
        self.engine.backend = self
        self.engine.alias = alias
        self.alias = alias
        self.settings_dict = settings_dict

        from orun.db.models.query import Session
        self.engine.session = Session(bind=self.engine)

        # A list of no-argument functions to run when the transaction commits.
        # Each entry is an (sids, func) tuple, where sids is a set of the
        # active savepoint IDs when this function was registered.
        self.run_on_commit = []

        # Should we run the on-commit hooks the next time set_autocommit(True)
        # is called?
        self.run_commit_hooks_on_set_autocommit_on = False

        # self.client = self.client_class(self)
        self.creation = self.creation_class(self)
        self.features = self.features_class(self)
        # self.introspection = self.introspection_class(self)
        self.ops = self.ops_class(self)
        # self.validation = self.validation_class(self)

        self.engine.features = self.features
        self.engine.creation = self.creation
        self.engine.ops = self.ops

    @property
    def _nodb_connection(self):
        """
        Return an alternative connection to be used when there is no need to
        access the main database, specifically for test db creation/deletion.
        This also prevents the production database from being exposed to
        potential child threads while (or after) the test database is destroyed.
        """
        raise NotImplementedError('subclasses of BaseDatabaseWrapper may require an _nodb_connection() method')

    def schema_editor(self):
        return self.SchemaEditorClass(self)

    def close(self):
        self.engine.session.close()

    @property
    def database_name(self):
        url = make_url(self.engine.url)
        return url.database

