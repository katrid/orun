import reptile.data
from orun.data.datasource import DataSource, Param


class ReportConnection:
    """
    Default report db connection
    """

    def datasource_factory(self, **kwargs):
        """
        Create a datasource instance compatible with reptile engine
        :param kwargs:
        :return:
        """
        return Query(**kwargs)


default_connection = ReportConnection()


class Query(DataSource, reptile.data.DataSource):
    def __init__(self, name=None, sql=None):
        reptile.data.DataSource.__init__(self)
        DataSource.__init__(self, sql=sql)
        self.name = name

    def load(self, structure: dict):
        self.name = structure['name']
        self.sql = structure['sql']

    def execute(self, params=None):
        rows = self._prepare(params)
        fields = [f[0] for f in self.fields]
        return [dict(zip(fields, row)) for row in rows]

    def open(self, params=None):
        if not self._opened and self.sql:
            super().open()
            self._data = self.execute(params)

    def __getattr__(self, item):
        return [obj[item] for obj in self._data]

    def __iter__(self):
        return iter(self.data)
