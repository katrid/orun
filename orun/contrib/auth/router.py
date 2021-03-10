
class AuditLogRouter:
    route_schemas = {}

    def db_for_read(self, model, **hints):
        if model._meta.schema in self.route_schemas:
            return 'audit_log'

    def db_for_write(self, model, **hints):
        if model._meta.schema in self.route_schemas:
            return 'audit_log'

    def allow_relation(self, obj1, obj2, **hints):
        pass

    def allow_migrate(self, db, schema, model_name=None, **hints):
        if schema in self.route_schemas:
            return db == 'audit_log'
