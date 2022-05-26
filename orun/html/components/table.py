from decimal import Decimal
from typing import Iterable

from orun.db import connection
from orun.utils.filters import default_filter


class Table:
    """Render a html table from sql query or any iterable"""

    def __init__(self, sql: str | Iterable, id_property=None):
        self.sql = sql
        self.id_property = id_property

    def __str__(self):
        cur = connection.cursor()
        cur.execute(self.sql)
        s = '<table class="table table-striped table-hover"><thead>'
        attrs = []
        for col in cur.description:
            s += f'<th'
            if col[1] == Decimal:
                attr = ' class="DecimalField"'
                s += attr
                attrs.append(attr)
            else:
                attrs.append('')
            s += f'>{col[0]}</th>'
        s += '</thead><tbody>'
        for row in cur.fetchall():
            s += '<tr'
            if self.id_property is not None:
                s += f' data-id="{row[self.id_property]}"'
            s += '>'
            for i, col in enumerate(row):
                s += f'<td{attrs[i]}>{default_filter(col)}</td>'
            s += '</tr>'
        s += '</tbody></table>'
        return s
