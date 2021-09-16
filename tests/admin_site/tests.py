from orun.test import TestCase


class AdminSiteTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from orun.contrib.admin.site import AdminSite
        cls.admin_site = AdminSite()

    def test_report(self):
        from orun.contrib.admin.actions import Report
        @self.admin_site.register
        class Report1(Report):
            pass

        self.admin_site.update()
