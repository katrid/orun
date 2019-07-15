from orun.db.backends.base.base import BaseDatabaseWrapper
from .schema import DatabaseSchemaEditor
from .creation import DatabaseCreation
from .features import DatabaseFeatures
from orun.db.backends.mssql.operations import DatabaseOperations


class DatabaseWrapper(BaseDatabaseWrapper):
    vendor = 'mssql'
    SchemaEditorClass = DatabaseSchemaEditor
    creation_class = DatabaseCreation
    features_class = DatabaseFeatures
    ops_class = DatabaseOperations

    data_types = {
        'AutoField': 'int',
        'BigAutoField': 'bigint',
        'BinaryField': 'binary',
        'BooleanField': 'bit',
        'CharField': 'varchar(%(max_length)s)',
        'DateField': 'date',
        'DateTimeField': 'datetime',
        'DecimalField': 'decimal(%(max_digits)s, %(decimal_places)s)',
        'DurationField': 'numeric',
        'FileField': 'varchar(%(max_length)s)',
        'FilePathField': 'varchar(%(max_length)s)',
        'FloatField': 'float',
        'IntegerField': 'int',
        'BigIntegerField': 'bigint',
        'IPAddressField': 'int',
        'GenericIPAddressField': 'int',
        'OneToOneField': 'bigint',
        'PositiveIntegerField': 'int',
        'PositiveSmallIntegerField': 'smallint',
        'SlugField': 'varchar(%(max_length)s)',
        'SmallIntegerField': 'smallint',
        'TextField': 'text',
        'TimeField': 'time',
        'UUIDField': 'varchar(36)',
    }
    data_type_check_constraints = {
        'PositiveIntegerField': '"%(column)s" >= 0',
        'PositiveSmallIntegerField': '"%(column)s" >= 0',
    }


