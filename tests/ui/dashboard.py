from .base import TestChrome


class TestDashboard(TestChrome):
    def test_server(self):
        url = self.get_server_url()

    def test_server2(self):
        pass
