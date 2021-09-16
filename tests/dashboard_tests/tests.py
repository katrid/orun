from orun.apps import apps
from orun.test import TestCase, override_settings
from orun.test.client import Client
from . import views


@override_settings(ROOT_URLCONF='orun.contrib.admin.urls')
class DashboardTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = Client()

    def test_render(self):
        res = self.client.post('/web/')
        print(res)


@override_settings(ROOT_URLCONF='orun.contrib.admin.urls')
class WebTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = apps['auth.user']
        cls.superuser = User.objects.create_superuser(username='super', password='secret', email='super@example.com')
        cls.view = apps['ui.view'].objects.create(name='Test Dashboard', view_type='dashboard', template_name='web_tests/dashboard.jinja2')
        cls.action = apps['ir.action.view'].objects.create(name='Test Dashboard', view=cls.view)

    def setUp(self):
        self.client.force_login(self.superuser)

    def test_dashboard(self):
        res = self.client.post('/api/rpc/ir.action/load/', {'method': 'load', 'params': {'args': [self.action.pk]}}, content_type='application/json')
        data = res.json()
        self.assertEqual(data['result']['name'], self.action.name)
        res = self.client.post('/api/rpc/ir.action.view/get_view/', {'method': 'get_view', 'params': {'args': [self.action.pk]}}, content_type='application/json')
        data = res.json()
        self.assertIn('</dashboard-view>', data['result']['content'])

    def test_query(self):
        apps['res.partner'].objects.create(name='Partner Name')
        cat = apps['ir.query.category'].objects.create(name='Test Category')
        q = apps['ir.query'].objects.create(name='Test Query', sql='SELECT id, name, email FROM res_partner', category=cat)
        # test result as list
        res = self.client.post('/api/rpc/ir.query/read/', {'method': 'read', 'params': {'args': [q.pk], 'kwargs': {'as_dict': False}}}, content_type='application/json')
        data = res.json()
        self.assertEqual(data['result']['fields'], ['id', 'name', 'email'])
        self.assertIsInstance(data['result']['data'][0], list)
        # test result as dict
        res = self.client.post('/api/rpc/ir.query/read/', {'method': 'read', 'params': {'args': [q.pk], 'kwargs': {'as_dict': True}}}, content_type='application/json')
        data = res.json()
        self.assertEqual(data['result']['fields'], ['id', 'name', 'email'])
        self.assertIsInstance(data['result']['data'][0], dict)

