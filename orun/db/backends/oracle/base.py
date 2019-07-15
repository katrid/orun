from sqlalchemy.engine.url import URL

from orun.db.backends.base.base import BaseBackend
from .schema import DatabaseSchemaEditor


class Backend(BaseBackend):
    SchemaEditorClass = DatabaseSchemaEditor

    @classmethod
    def create_engine(cls, db, url):
        # db = 'usr_' + db
        new_url = URL(
            url.drivername, username=db, password=url.password, host=url.host, port=url.port, database=url.database
        )
        return super(Backend, cls).create_engine(db, url, coerce_to_unicode=True)
