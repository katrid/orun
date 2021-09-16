from orun.views.dashboard import Dashboard
from orun.contrib import admin


@admin.register('test.dashboard')
class TestDashboard(Dashboard):
    def get(self, request):
        return '<dashboard>teste</dashboard>'
