from orun.apps import AppConfig
from orun.db.models.events import post_migrate
from orun.test.utils import test_db_created


class CoreConfig(AppConfig):
    name = 'erp.core'
    db_schema = 'core'
    create_schema = True

    def ready(self):
        super().ready()
        from . import management

        post_migrate.add_listener(management.create_models)

        self._cache_models()

        async def _refresh_models(event):
            self._cache_models()
        test_db_created.add_listener(_refresh_models)

    def _cache_models(self):
        from erp.core.models.content import refresh_model_cache

        refresh_model_cache()
