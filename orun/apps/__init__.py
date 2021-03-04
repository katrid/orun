import os

from .config import AppConfig
from .registry import apps

__all__ = ['AppConfig', 'apps', 'Orun']


class Orun:
    """Initialize an orun instance as a class wrapper"""

    settings: dict = None
    settings_module = 'orun.apps.default_settings'

    def __init__(self, settings: dict = None):
        from orun.apps import default_settings
        self._mounted = False
        self.urlspatterns = []

        if settings:
            self.settings = settings
        else:
            self.settings = {}

        for k, v in self.settings.items():
            if not k.startswith('_'):
                setattr(default_settings, k, v)

        os.environ.setdefault('ORUN_SETTINGS_MODULE', self.settings_module)
        from orun.apps.config import app_config_ready
        app_config_ready.connect(self._app_config_ready)

    def setup(self):
        import orun
        orun.setup()

    def _app_config_ready(self, signal, sender: AppConfig, **kwargs):
        from orun.urls import path, include
        if not self._mounted:
            self._mount()
        if sender.urls_module:
            self.urlspatterns.append(path('', include(sender.urls_module)))

    def _mount(self):
        from orun.urls import path, include
        from orun.apps import default_urls
        self._mounted = True
        self.urlspatterns.insert(0, path('', include('orun.contrib.staticfiles.urls')))
        default_urls.urlpatterns = self.urlspatterns

    def cli(self, command: str, *args):
        from orun.core.management import execute_from_command_line
        execute_from_command_line(['orun.__main__.py', command, *args])

    def run(self, host='127.0.0.1', port=8000):
        from orun.core.management import call_command
        call_command('runserver', f'{host}:{port}')
