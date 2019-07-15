from sqlalchemy.engine.url import make_url

from orun.db.backends.base.base import BaseDatabaseWrapper
from .schema import DatabaseSchemaEditor
from .creation import DatabaseCreation
from .features import DatabaseFeatures
from .operations import DatabaseOperations


class DatabaseWrapper(BaseDatabaseWrapper):
    SchemaEditorClass = DatabaseSchemaEditor
    creation_class = DatabaseCreation
    features_class = DatabaseFeatures
    ops_class = DatabaseOperations

    def _nodb_connection(self):
        return self.__class__('sqlite://')
