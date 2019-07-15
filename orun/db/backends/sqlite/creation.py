from orun.db.backends.base.creation import BaseDatabaseCreation


class DatabaseCreation(BaseDatabaseCreation):
    def _get_test_db_name(self):
        if self.connection.engine.url.database is None:
            return ':memory:'
        return super()._get_test_db_name()

    def _execute_create_test_db(self, cursor, parameters, keepdb=False):
        pass
