import uuid

from orun.conf import settings
from orun.db.backends.base.operations import BaseDatabaseOperations
from orun.utils import timezone
from orun.utils.encoding import force_text


class DatabaseOperations(BaseDatabaseOperations):
    # MySQL stores positive fields as UNSIGNED ints.
    integer_field_ranges = dict(
        BaseDatabaseOperations.integer_field_ranges,
        PositiveSmallIntegerField=(0, 65535),
        PositiveIntegerField=(0, 4294967295),
    )

    def date_extract_sql(self, lookup_type, field_name):
        # http://dev.mysql.com/doc/mysql/en/date-and-time-functions.html
        if lookup_type == 'week_day':
            # DAYOFWEEK() returns an integer, 1-7, Sunday=1.
            # Note: WEEKDAY() returns 0-6, Monday=0.
            return "DAYOFWEEK(%s)" % field_name
        else:
            return "EXTRACT(%s FROM %s)" % (lookup_type.upper(), field_name)

    def date_trunc_sql(self, lookup_type, field_name):
        fields = {
            'year': '%%Y-01-01',
            'month': '%%Y-%%m-01',
        }  # Use double percents to escape.
        if lookup_type in fields:
            format_str = fields[lookup_type]
            return "CAST(DATE_FORMAT(%s, '%s') AS DATE)" % (field_name, format_str)
        else:
            return "DATE(%s)" % (field_name)

    def datetime_cast_date_sql(self, field_name, tzname):
        field_name, params = self._convert_field_to_tz(field_name, tzname)
        sql = "DATE(%s)" % field_name
        return sql, params

    def datetime_extract_sql(self, lookup_type, field_name, tzname):
        field_name, params = self._convert_field_to_tz(field_name, tzname)
        sql = self.date_extract_sql(lookup_type, field_name)
        return sql, params

    def date_interval_sql(self, timedelta):
        return "INTERVAL '%d 0:0:%d:%d' DAY_MICROSECOND" % (
            timedelta.days, timedelta.seconds, timedelta.microseconds), []

    def force_no_ordering(self):
        """
        "ORDER BY NULL" prevents MySQL from implicitly ordering by grouped
        columns. If no ordering would otherwise be applied, we don't want any
        implicit sorting going on.
        """
        return [(None, ("NULL", [], False))]

    def last_executed_query(self, cursor, sql, params):
        # With MySQLdb, cursor objects have an (undocumented) "_last_executed"
        # attribute where the exact query sent to the database is saved.
        # See MySQLdb/cursors.py in the source distribution.
        return force_text(getattr(cursor, '_last_executed', None), errors='replace')

    def no_limit_value(self):
        # 2**64 - 1, as recommended by the MySQL documentation
        return 18446744073709551615

    def quote_name(self, name):
        if name.startswith("`") and name.endswith("`"):
            return name  # Quoting once is enough.
        return "`%s`" % name

    def random_function_sql(self):
        return 'RAND()'

    def max_name_length(self):
        return 64
