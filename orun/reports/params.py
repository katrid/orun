import datetime
import dateutil
from dateutil.relativedelta import relativedelta


def dateadd(datepart: str, number: str, date: datetime.date):
    dp = datepart.lower()
    if dp == 'month':
        return date + relativedelta(months=number)
    elif dp == 'year':
        return date + relativedelta(years=number)
    elif dp == 'day':
        return date + relativedelta(days=number)


def prepare_params(params, context=None):
    if context is None:
        context = {}

    if params:
        context = {}
        return eval(params, {
            'dateutil': dateutil,
            'datetime': datetime,
            'now': datetime.datetime.now(),
            'date': datetime.date,
            'relativedelta': relativedelta,
            'dateadd': dateadd,
        }, context)
