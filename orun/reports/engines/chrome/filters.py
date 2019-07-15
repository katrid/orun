import json
import types
import markupsafe
import datetime
import decimal
import itertools
from jinja2.filters import groupby

from orun.utils import formats


def localize(value, fmt=None):
    if fmt is not None:
        if fmt == 'date':
            if isinstance(value, str):
                value = datetime.date.fromisoformat(value)
    if value is None:
        return ''
    elif isinstance(value, (decimal.Decimal, float)):
        return formats.number_format(value, 2, force_grouping=True)
    elif isinstance(value, datetime.datetime):
        return formats.date_format(value, 'SHORT_DATETIME_FORMAT')
    elif isinstance(value, datetime.date):
        return formats.date_format(value, 'SHORT_DATE_FORMAT')
    elif isinstance(value, types.GeneratorType):
        return json.dumps(list(value))

    return str(value)


def linebreaks(text):
    return text.replace('\n', markupsafe.Markup('<br/>'))


def groupby(value, attribute):
    expr = lambda x: x[attribute]
    return itertools.groupby(sorted(value, key=expr), expr)

