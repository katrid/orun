import datetime
import decimal
import hashlib
import logging

from orun.conf import settings
from orun.utils.encoding import force_bytes
from orun.utils.timezone import utc

logger = logging.getLogger('orun.db.backends')


###############################################
# Converters from database (string) to Python #
###############################################

def typecast_date(s):
    return datetime.date(*map(int, s.split('-'))) if s else None  # returns None if s is null


def typecast_time(s):  # does NOT store time zone information
    if not s:
        return None
    hour, minutes, seconds = s.split(':')
    if '.' in seconds:  # check whether seconds have a fractional part
        seconds, microseconds = seconds.split('.')
    else:
        microseconds = '0'
    return datetime.time(int(hour), int(minutes), int(seconds), int((microseconds + '000000')[:6]))


def typecast_timestamp(s):  # does NOT store time zone information
    # "2005-07-29 15:48:00.590358-05"
    # "2005-07-29 09:56:00-05"
    if not s:
        return None
    if ' ' not in s:
        return typecast_date(s)
    d, t = s.split()
    # Extract timezone information, if it exists. Currently we just throw
    # it away, but in the future we may make use of it.
    if '-' in t:
        t, tz = t.split('-', 1)
        tz = '-' + tz
    elif '+' in t:
        t, tz = t.split('+', 1)
        tz = '+' + tz
    else:
        tz = ''
    dates = d.split('-')
    times = t.split(':')
    seconds = times[2]
    if '.' in seconds:  # check whether seconds have a fractional part
        seconds, microseconds = seconds.split('.')
    else:
        microseconds = '0'
    tzinfo = utc if settings.USE_TZ else None
    return datetime.datetime(
        int(dates[0]), int(dates[1]), int(dates[2]),
        int(times[0]), int(times[1]), int(seconds),
        int((microseconds + '000000')[:6]), tzinfo
    )


def typecast_decimal(s):
    if s is None or s == '':
        return None
    return decimal.Decimal(s)


###############################################
# Converters from Python to database (string) #
###############################################

def rev_typecast_decimal(d):
    if d is None:
        return None
    return str(d)


def truncate_name(name, length=None, hash_len=4):
    """Shortens a string to a repeatable mangled version with the given length.
    """
    if length is None or len(name) <= length:
        return name

    hsh = hashlib.md5(force_bytes(name)).hexdigest()[:hash_len]
    return '%s%s' % (name[:length - hash_len], hsh)


def format_number(value, max_digits, decimal_places):
    """
    Formats a number into a string with the requisite number of digits and
    decimal places.
    """
    if value is None:
        return None
    if isinstance(value, decimal.Decimal):
        context = decimal.getcontext().copy()
        if max_digits is not None:
            context.prec = max_digits
        if decimal_places is not None:
            value = value.quantize(decimal.Decimal(".1") ** decimal_places, context=context)
        else:
            context.traps[decimal.Rounded] = 1
            value = context.create_decimal(value)
        return "{:f}".format(value)
    if decimal_places is not None:
        return "%.*f" % (decimal_places, value)
    return "{:f}".format(value)
