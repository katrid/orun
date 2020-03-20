import json
import types
import markupsafe
import datetime
import decimal
import itertools
from jinja2.filters import groupby
from jinja2 import contextfunction

from orun.utils import formats


@contextfunction
def localize(ctx, value, fmt=None):
    if fmt is not None:
        if fmt == 'date':
            if isinstance(value, str):
                value = datetime.date.fromisoformat(value)
    if value is None or value == '':
        return ''
    this = ctx.parent.get('this')
    if this and this.format_type:
        if this.format_type == 'DateTime':
            if this.display_format:
                return value.strftime(this.display_format)
            return formats.date_format(value, 'SHORT_DATE_FORMAT')
        elif this.format_type == 'Numeric':
            return formats.number_format(value, 2, force_grouping=True)
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

