
DATABASES = {
    "default": {
        "ENGINE": "orun.db.backends.sqlite3",
    },
    "other": {
        "ENGINE": "orun.db.backends.sqlite3",
    },
}

SECRET_KEY = "orun_tests_secret_key"

# Use a fast hasher to speed up tests.
PASSWORD_HASHERS = [
    "orun.contrib.auth.hashers.MD5PasswordHasher",
]

DEFAULT_AUTO_FIELD = "orun.db.models.BigAutoField"

USE_TZ = False
