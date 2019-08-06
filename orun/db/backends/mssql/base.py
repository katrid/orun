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

    def data_type_eq(self, old_type, new_type):
        r = super().data_type_eq(old_type, new_type)
        if new_type == 'BOOLEAN' and old_type.startswith('BIT'):
            return True
        if new_type == 'BOOLEAN' and old_type.startswith('BIT'):
            return True
        if new_type == 'BLOB' and old_type.startswith('VARBINARY'):
            return True
        if new_type == 'TEXT' and (old_type == 'TEXT' or old_type.startswith('VARCHAR')):
            return True
        if new_type == 'VARCHAR' and (old_type == 'TEXT' or old_type.startswith('VARCHAR')):
            return True
        if new_type.startswith('NUMERIC') and old_type.startswith('NUMERIC'):
            return True
        return r
