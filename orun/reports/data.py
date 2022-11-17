import reptile.engine
from orun.data.datasource import DataSource, Param


class Query(DataSource, reptile.engine.DataSource):
    def __init__(self, name=None, sql=None):
        reptile.engine.DataSource.__init__(self, name)
        DataSource.__init__(self, sql=sql)

    def load(self, structure: dict):
        self.name = structure['name']
        self.sql = structure['sql']

    def execute(self, params=None):
        rows = self._prepare(params)
        fields = [f[0] for f in self.fields]
        return [dict(zip(fields, row)) for row in rows]

    def open(self):
        if not self._opened and self.sql:
            super().open()
            self._data = self.execute()

    def __getattr__(self, item):
        return [obj[item] for obj in self._data]

    def __iter__(self):
        return iter(self.data)
