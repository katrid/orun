from datetime import timedelta

settings = {
    'INSTALLED_APPS': [],
    'DEFAULT_INDEX_TABLESPACE': None,
    'DEBUG': True,
    'SQL_DEBUG': False,
    'WEBSOCKET': False,
    'PERMANENT_SESSION_LIFETIME': timedelta(days=365),

    'LOCALE_PATHS': [],
    'LANGUAGE_CODE': 'en-us',
    'USE_I18N': True,
    'USE_L10N': True,
    'USE_THOUSAND_SEPARATOR': False,

    'USE_TZ': False,
    'DATABASES': {'default': {'ENGINE': 'sqlite:///'}},
    'DATABASE_ROUTERS': [],
    'MIGRATION_MODULES': {},
    'MEDIA_ROOT': None,
    'STATIC_ROOT': None,
    'MAX_NAME_LENGTH': 30,
    'TIME_ZONE': None,
    'SERIALIZATION_MODULES': {},
    'DEFAULT_CHARSET': 'utf-8',
    'DATABASE_SCHEMA_SUPPORT': False,
    'DEFAULT_FILE_STORAGE': 'orun.core.files.storage.FileSystemStorage',
    'FILE_UPLOAD_PERMISSIONS': None,
    'FILE_UPLOAD_DIRECTORY_PERMISSIONS': None,
    'PUBLIC_QUERY_ALLOWED': False,
    'SEND_FILE_MAX_AGE_DEFAULT': 0,

    'FORMAT_MODULE_PATH': None,
    'DATE_INPUT_FORMATS': [
        '%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y',  # '2006-10-25', '10/25/2006', '10/25/06'
        '%b %d %Y', '%b %d, %Y',  # 'Oct 25 2006', 'Oct 25, 2006'
        '%d %b %Y', '%d %b, %Y',  # '25 Oct 2006', '25 Oct, 2006'
        '%B %d %Y', '%B %d, %Y',  # 'October 25 2006', 'October 25, 2006'
        '%d %B %Y', '%d %B, %Y',  # '25 October 2006', '25 October, 2006'
    ],
    'TIME_INPUT_FORMATS': [
        '%H:%M:%S',  # '14:30:59'
        '%H:%M:%S.%f',  # '14:30:59.000200'
        '%H:%M',  # '14:30'
    ],
    'DATETIME_INPUT_FORMATS': [
        '%Y-%m-%d %H:%M:%S',     # '2006-10-25 14:30:59'
        '%Y-%m-%d %H:%M:%S.%f',  # '2006-10-25 14:30:59.000200'
        '%Y-%m-%d %H:%M',        # '2006-10-25 14:30'
        '%Y-%m-%d',              # '2006-10-25'
        '%m/%d/%Y %H:%M:%S',     # '10/25/2006 14:30:59'
        '%m/%d/%Y %H:%M:%S.%f',  # '10/25/2006 14:30:59.000200'
        '%m/%d/%Y %H:%M',        # '10/25/2006 14:30'
        '%m/%d/%Y',              # '10/25/2006'
        '%m/%d/%y %H:%M:%S',     # '10/25/06 14:30:59'
        '%m/%d/%y %H:%M:%S.%f',  # '10/25/06 14:30:59.000200'
        '%m/%d/%y %H:%M',        # '10/25/06 14:30'
        '%m/%d/%y',              # '10/25/06'
    ],
    'PASSWORD_HASHERS': [
        'orun.auth.hashers.PBKDF2PasswordHasher',
        'orun.auth.hashers.PBKDF2SHA1PasswordHasher',
        'orun.auth.hashers.Argon2PasswordHasher',
        'orun.auth.hashers.BCryptSHA256PasswordHasher',
        'orun.auth.hashers.BCryptPasswordHasher',
    ],
}
