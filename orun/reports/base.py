from typing import List, Any

from .totals import Total


class Report:
    def __init__(self):
        super().__init__()
        self.stream = []

    def write(self, s: str):
        pass

    def write_line(self, s: str):
        self.stream.append(s)

    def prepare(self):
        pass

    def render_to_response(self, context, **response_kwargs):
        self.prepare()
        super().render_to_response(context, **response_kwargs)


class Column:
    def __init__(self, name: str = None, auto_created=False, auto_size=None, length=-1):
        self.name = name


class TabularReport(Report):
    _report_format = 'text'

    def __init__(self):
        super().__init__()
        self.columns: List[Column] = []
        self.totals: List[Total] = []
        self.report_format = self._report_format

    @property
    def report_format(self):
        return self._report_format

    @report_format.setter
    def report_format(self, value):
        self._report_format = value
        if value == 'json':
            self.content_type = 'application/json'
        elif value == 'html':
            self.content_type = 'text/html'
        else:
            self.content_type = 'text/plain'

    def write_headers(self, headers: List[str]):
        if not self.columns:
            for header in headers:
                self.columns.append(Column(header, auto_created=True))

    def _write_cell(self, col: Column, val: Any):
        pass

    def write_row(self, cells: List):
        if not self.columns:
            for cell in cells:
                self.columns.append(Column(auto_created=True))
        for col, cell in zip(self.columns, cells):
            self._write_cell(col, cell)


class PaginatedReport(Report):
    content_type = 'application/json'
    _report_format = 'json'

    @property
    def report_format(self):
        return self._report_format

    @report_format.setter
    def report_format(self, value):
        self._report_format = value
        if value == 'json':
            self.content_type = 'application/json'
        elif value == 'html':
            self.content_type = 'text/html'
