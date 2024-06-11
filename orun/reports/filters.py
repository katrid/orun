import os
import json
import types
import re
import markupsafe
import datetime
import decimal
import itertools
from base64 import encodebytes

from jinja2 import pass_context, Undefined
from reptile.bands.widgets import Text

from orun.utils import formats


_FMT_FLOAT = re.compile(r'\.(\d+)f')


@pass_context
def localize(context, value, fmt=None):
    if value is None or value == '' or isinstance(value, Undefined):
        return ''
    this = context.parent.get('this')
    if value and isinstance(this, Text):
        if disp := this.display_format:
            if isinstance(value, (decimal.Decimal, float, int)) and disp.kind == 'Numeric':
                if dec_places := _FMT_FLOAT.findall(disp.format):
                    return formats.number_format(value, int(dec_places[0]), force_grouping=True)
            elif isinstance(value, (datetime.date, datetime.datetime)) and disp.kind == 'DateTime':
                return value.strftime(disp.format)

    if fmt is not None:
        if fmt == 'date':
            if isinstance(value, str):
                value = datetime.date.fromisoformat(value)
    if isinstance(value, (decimal.Decimal, float)):
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


def encode_image_file(image_file: str):
    if os.path.isfile(image_file):
        with open(image_file, 'rb') as f:
            ext = image_file.rsplit('.')[-1]
            return f"data:image/{ext};base64,{encodebytes(f.read()).decode('utf-8')}"

