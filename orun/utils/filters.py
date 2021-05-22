import json
import types
import datetime
import decimal
from orun.utils import formats


def default_filter(value):
    if value is None:
        return ''
    if isinstance(value, (decimal.Decimal, float)):
        return formats.number_format(value, 2, force_grouping=True)
    if isinstance(value, datetime.datetime):
        return formats.date_format(value, 'SHORT_DATETIME_FORMAT')
    if isinstance(value, datetime.date):
        return formats.date_format(value, 'SHORT_DATE_FORMAT')
    if isinstance(value, types.GeneratorType):
        return json.dumps(list(value))

    return str(value)
