from orun.apps import AppConfig


class ErpAdminConfig(AppConfig):
    name = 'erp.admin'
    js_assets = [
        '<script type="text/javascript" src="/static/erp.admin/components/index.js"></script>'
    ]
