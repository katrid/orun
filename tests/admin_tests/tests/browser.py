import time
from orun.test import LiveServerTestCase, override_settings
from orun.contrib.admin.test import ClientRPC
from orun.apps import apps

from selenium.webdriver import Firefox


TEST_PASSWORD = '9RBE8UXvqE4jgrPk'


@override_settings(ROOT_URLCONF='admin_tests.urls', DEBUG=True)
class BrowserTestCase(LiveServerTestCase):
    available_apps = (
        'orun.contrib.contenttypes', 'orun.contrib.auth', 'orun.contrib.admin', 'orun.contrib.erp', 'admin_tests'
    )
    fixtures = {
        'orun.contrib.erp': [
            'modules.xml', 'views.xml', 'actions.xml', 'menu.xml', 'currency.xml', 'country.xml', 'partner.xml'
        ],
        'admin_tests': ['admin.xml'],
    }

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.browser = Firefox()
        cls.browser.implicitly_wait(10)

    def setUp(self):
        user = apps['auth.user'].objects.filter(username='admin').first()
        user.set_password(TEST_PASSWORD)
        user.save()
        self.client = ClientRPC()

    def test_browser(self):
        self.client.login(username='admin', password=TEST_PASSWORD)
        self.browser.get(f'{self.live_server_url}/web/login/')
        self.browser.implicitly_wait(10)
        self.browser.find_element_by_name('username').send_keys('admin')
        self.browser.find_element_by_name('password').send_keys(TEST_PASSWORD)
        self.browser.find_element_by_tag_name('button').click()
        self.browser.implicitly_wait(10)
        self.browser.find_element_by_id('apps-button').click()
        time.sleep(0.5)
        self.browser.find_element_by_css_selector('a.module-selector:last-of-type').click()
        self.browser.implicitly_wait(3)
        time.sleep(0.5)
        self.assertEqual(self.browser.find_element_by_css_selector('li.breadcrumb-item').text, 'Test Widgets')
        # create a new record
        self.browser.find_element_by_css_selector('button.toolbutton-action-create').click()
        self.browser.implicitly_wait(3)
        time.sleep(0.5)
        self.browser.find_element_by_name('name').send_keys('This is a test name')
        self.browser.implicitly_wait(3)
        self.browser.find_element_by_css_selector('button.toolbutton-action-save').click()
        time.sleep(100)
