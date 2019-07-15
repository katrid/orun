from .base import TestChrome


class TestDashboard(TestChrome):
    def test_server(self):
        url = self.get_server_url()
        url += '/web/#/app/dashboard.editor/'
        self.driver.get(url)
        print(url)

    def test_server2(self):
        pass
