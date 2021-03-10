import orun.contrib.auth.router


class AdminLogRouter(orun.contrib.auth.router.AuditLogRouter):
    route_schemas = {'admin'}
