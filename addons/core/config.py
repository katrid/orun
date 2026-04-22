from typing import Any
from urllib.parse import urlsplit, urljoin

from orun.apps import apps
from orun.apps import contributes
from core.models import CoreSettings, UserProfile

KEY_NAME = 'core://settings/'
PROFILE_KEY = 'core://user.profile/'



class ConfigurationService:
    def __init__(self):
        self._schema: dict[str, contributes.Configuration] = {}
        self._properties: dict[str, contributes.ConfigurationProperty] = {}

    def get(self, key: str, *,  user_id: int = None) -> Any:
        # direct postgresql query using $ notation
        ## TODO implement it in more db vendors
        uri_key = urljoin(KEY_NAME, key)
        user_key = None
        if user_id:
            url = urlsplit(KEY_NAME)
            url._replace(netloc=f'user:{user_id}')
            user_key = urljoin(url.geturl(), key)
        keys = (uri_key, user_key) if user_key else (uri_key,)
        res = None
        for data in CoreSettings.objects.filter(key__in=keys):
            if data.key == user_key:
                return data.value
            else:
                res = data.value
        if res is None:
            return self.get_default(uri_key)
        return res

    def set(self, key: str, value: Any, *, user_id: int = None) -> None:
        uri_key = urljoin(KEY_NAME, key)
        if user_id:
            url = urlsplit(KEY_NAME)
            url._replace(netloc=f'user:{user_id}')
            uri_key = url.geturl()
        CoreSettings.objects.update_or_create(key=uri_key, defaults={'value': value})

    def delete(self, key: str):
        CoreSettings.objects.filter(key=key).delete()

    def all(self, *, user_id: int = None, company_id: int = None) -> dict[str, Any]:
        return {
            data.key: data.value
            for data in CoreSettings.objects.filter(key=KEY_NAME)
        }

    def get_default(self, key: str) -> Any:
        if prop := self._properties.get(key):
            return prop.get('default')

    def get_metadata(self):
        return [contributes for addon in apps.addons if (contributes := addon.contributes())]

    def _set_schema(self, schema: dict[str, contributes.Configuration]):
        self._schema = schema
        if schema:
            self._properties = {}
            for v in schema.values():
                self._properties.update(v['properties'])


def get(key: str):
    return config.get(key)


def set(key: str, value: Any):
    config.set(key, value)


def reset(key: str):
    config.delete(key)


def get_user_profile(user_id: int, key: str = PROFILE_KEY) -> str:
    if profile := UserProfile.objects.filter(user_id=user_id, key=key).first():
        return profile.value
    

def set_user_profile(user_id: int, key: str, value: str | dict):
    UserProfile.objects.update_or_create(user_id=user_id, key=key, defaults={'value': value})


config = ConfigurationService()
