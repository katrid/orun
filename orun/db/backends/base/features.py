

class BaseDatabaseFeatures:
    supports_schema = False

    can_rollback_ddl = False
    can_defer_constraint_checks = False

    supports_transactions = True
    # Does the backend truncate names properly when they are too long?
    truncates_names = False

    # Does the backend support indexing a TextField?
    supports_index_on_text_field = True

    def __init__(self, connection):
        self.connection = connection

