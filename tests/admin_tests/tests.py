from orun.test import TestCase, override_settings
from orun.contrib.admin.test import ClientRPC
from orun.apps import apps


TEST_PASSWORD = '9RBE8UXvqE4jgrPk'


@override_settings(ROOT_URLCONF='orun.contrib.admin.urls')
class UItestCase(TestCase):
    fixtures = {
        'admin_tests': ['users.xml'],
    }

    def setUp(self):
        user = apps['auth.user'].objects.filter(username='test').first()
        user.set_password(TEST_PASSWORD)
        user.save()
        self.client = ClientRPC()

    def test_browser(self):
        pass

    def test_api(self):
        self.client.login(username='test', password=TEST_PASSWORD)
        res = self.client.rpc('admin_tests.tag', 'write', {'name': 'Red Tag'})
        self.assertEqual(res.status_code, 200)
        Tag = apps['admin_tests.tag']
        tag = Tag.objects.first()
        self.assertIsNotNone(tag)
        self.assertEqual(tag.name, 'Red Tag')
