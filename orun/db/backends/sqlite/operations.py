from orun.db.backends.base.operations import BaseDatabaseOperations


class DatabaseOperations(BaseDatabaseOperations):
    def quote_name(self, name):
        if name == ':memory:' or name is None:
            return ':memory:'
        return super().quote_name(name)
