from flask import current_app, _app_ctx_stack
from orun.conf import global_settings


ADDONS_ENVIRONMENT_VARIABLE = 'ORUN_ADDONS_PATH'


class Settings:
    def __getitem__(self, item):
        # Get global settings if there'n no app instance running
        if _app_ctx_stack.top is None:
            return global_settings.settings.get(item)
        return current_app.config.get(item)

    def __getattr__(self, item):
        return self[item]

    def __setitem__(self, key, value):
        # Set to global settings if there's no app instance running
        if _app_ctx_stack.top is None:
            global_settings.settings[key] = value
        else:
            app.config[key] = value

    def __setattr__(self, key, value):
        self[key] = value


settings = Settings()
