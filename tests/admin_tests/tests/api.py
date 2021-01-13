from orun.test import TestCase, override_settings
from orun.contrib.admin.test import ClientRPC
from orun.apps import apps


TEST_PASSWORD = '9RBE8UXvqE4jgrPk'


@override_settings(ROOT_URLCONF='orun.contrib.admin.urls')
class UITestCase(TestCase):
    fixtures = {
        'admin_tests': ['users.xml'],
    }

    def setUp(self):
        user = apps['auth.user'].objects.filter(username='test').first()
        user.set_password(TEST_PASSWORD)
        user.save()
        self.client = ClientRPC()

    def test_api(self):
        self.client.login(username='test', password=TEST_PASSWORD)
        res = self.client.rpc('admin_tests.tag', 'write', {'name': 'Red Tag'})
        self.assertEqual(res.status_code, 200)
        Tag = apps['admin_tests.tag']
        tag = Tag.objects.first()
        self.assertIsNotNone(tag)
        self.assertEqual(tag.name, 'Red Tag')
        res = self.client.rpc('admin_tests.partner', 'write', {'name': 'Partner 1'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('result', res.json())
        Partner = apps['admin_tests.partner']
        partner = Partner.objects.first()
        self.assertIsNotNone(partner)

        valid_data = {'name': 'Test Widgets 01'}
        res = self.client.rpc('admin_tests.widgets', 'write', valid_data)
        data = res.json()
        self.assertTrue('error' in data)
        error = data['error']
        msgs = error['messages']

        # fields validation
        Widgets = apps['admin_tests.widgets']
        widgets = Widgets.objects.all()
        self.assertEqual(len(widgets), 0)

        self.assertEqual(msgs['string_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['integer_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['fk_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['choice_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['date_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['datetime_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['time_field_nn'], ['This field cannot be null.'])
        self.assertEqual(msgs['text_field_nn'], ['This field cannot be null.'])

        # fill the required fields and try it again
        valid_data.update({
            'string_field_nn': 'valid string value',
            'integer_field_nn': 10,
            'fk_field_nn': partner.pk,
            'choice_field_nn': '1',
            'date_field_nn': '2020-01-01',
            'datetime_field_nn': '2020-01-01 00:00',
            'time_field_nn': '00:00:00',
            'text_field': 'Long text content\nWith a new line',
        })

        res = self.client.rpc('admin_tests.widgets', 'write', valid_data)
        self.assertEqual(res.status_code, 200)
