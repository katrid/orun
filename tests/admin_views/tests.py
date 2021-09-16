from time import sleep
import datetime

from orun.apps import apps
from orun.test import TestCase, modify_settings, override_settings
from orun.urls import reverse
from orun.contrib.admin.tests import AdminSeleniumTestCase
from .models import (
    User, Actor, Author,
    Section, Article, PrePopulatedPost, Color, Fabric, Chapter, ChapterXtra1, Book, Promo,
    NestedData,
)


@override_settings(ROOT_URLCONF='admin_views.urls', USE_I18N=True, USE_L10N=False, LANGUAGE_CODE='en')
@modify_settings(INSTALLED_APPS={'append': 'orun.contrib.erp'})
class AdminViewBasicTestCase(TestCase):
    fixtures = {
        'orun.contrib.erp': ['partner.xml'],
    }

    @classmethod
    def setUpTestData(cls):
        cls.superuser = User.objects.create_superuser(username='super', name='Super', password='secret', email='super@example.com')
        cls.s1 = Section.objects.create(name='Test section')
        cls.a1 = Article.objects.create(
            content='<p>Middle content</p>',
            date=datetime.datetime(2008, 3, 18, 11, 54, 58),
            section=cls.s1,
            title='Article 1',
        )
        cls.a2 = Article.objects.create(
            content='<p>Oldest content</p>',
            date=datetime.datetime(2000, 3, 18, 11, 54, 58),
            section=cls.s1,
            title='Article 2',
        )
        cls.a3 = Article.objects.create(
            content='<p>Newest content</p>', date=datetime.datetime(2009, 3, 18, 11, 54, 58), section=cls.s1
        )
        cls.p1 = PrePopulatedPost.objects.create(title='A Long Title', published=True, slug='a-long-title')
        cls.color1 = Color.objects.create(value='Red', warm=True)
        cls.color2 = Color.objects.create(value='Orange', warm=True)
        cls.color3 = Color.objects.create(value='Blue', warm=False)
        cls.color4 = Color.objects.create(value='Green', warm=False)
        cls.fab1 = Fabric.objects.create(surface='x')
        cls.fab2 = Fabric.objects.create(surface='y')
        cls.fab3 = Fabric.objects.create(surface='plain')
        cls.b1 = Book.objects.create(name='Book 1')
        cls.b2 = Book.objects.create(name='Book 2')
        cls.pro1 = Promo.objects.create(name='Promo 1', book=cls.b1)
        cls.pro1 = Promo.objects.create(name='Promo 2', book=cls.b2)
        cls.chap1 = Chapter.objects.create(title='Chapter 1', content='[ insert contents here ]', book=cls.b1)
        cls.chap2 = Chapter.objects.create(title='Chapter 2', content='[ insert contents here ]', book=cls.b1)
        cls.chap3 = Chapter.objects.create(title='Chapter 1', content='[ insert contents here ]', book=cls.b2)
        cls.chap4 = Chapter.objects.create(title='Chapter 2', content='[ insert contents here ]', book=cls.b2)
        cls.cx1 = ChapterXtra1.objects.create(chap=cls.chap1, xtra='ChapterXtra1 1')
        cls.cx2 = ChapterXtra1.objects.create(chap=cls.chap3, xtra='ChapterXtra1 2')
        Actor.objects.create(name='Palin', age=27)

    def setUp(self):
        self.client.force_login(self.superuser)

    def assertContentBefore(self, response, text1, text2, failing_msg=None):
        """
        Testing utility asserting that text1 appears before text2 in response
        content.
        """
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            response.content.index(text1.encode()),
            response.content.index(text2.encode()),
            (failing_msg or '') + '\nResponse:\n' + response.content.decode(response.charset)
        )

    def _test_api(self):
        from orun.contrib.admin.site import admin_site
        admin_site.update()
        pk = admin.BookWindowAction.get_id()

        res = self.client.post(
            '/api/rpc/ui.action/load/', {'method': 'load', 'params': {'args': [pk]}},
            content_type='application/json',
        )
        data = res.json()
        self.assertIn('result', data)
        data = data['result']
        self.assertEqual(data['action_type'], 'ui.action.window')
        self.assertEqual(data['id'], pk)

        res = self.client.post(
            '/api/rpc/admin_views.book/admin_load_views/', {
                'method': 'admin_load_views', 'params': {
                    'kwargs': {'form': None, 'list': None}
                },
            },
            content_type='application/json',
        )
        data = res.json()
        self.assertIn('result', data)
        data = data['result']
        fields = data['fields']
        self.assertIn('name', fields)
        name_field = fields['name']
        self.assertEqual(name_field['type'], 'CharField')
        self.assertEqual(name_field['max_length'], 100)
        self.assertEqual(list(fields.keys()), ['name', 'record_name', 'id'])

        pk = admin.AuthorWindowAction.get_id()
        res = self.client.post(
            '/api/rpc/ui.action/load/', {'method': 'load', 'params': {'args': [pk]}},
            content_type='application/json',
        )
        data = res.json()
        self.assertIn('result', data)
        data = data['result']
        self.assertEqual(data['action_type'], 'ui.action.window')
        self.assertEqual(data['id'], pk)

        res = self.client.post(
            '/api/rpc/admin_views.author/admin_load_views/', {
                'method': 'admin_load_views', 'params': {
                    'kwargs': {'form': None, 'list': None}
                },
            },
            content_type='application/json',
        )
        data = res.json()
        self.assertIn('result', data)
        data = data['result']
        fields = data['fields']
        books_field = fields['books']
        self.assertEqual(books_field['type'], 'OneToManyField')
        self.assertEqual(books_field['caption'], 'Books')
        self.assertEqual(books_field['field'], 'author')
        self.assertEqual(books_field['model'], 'admin_views.authorship')

    def test_nested_data(self):
        self.client.post(
            "/api/rpc/admin_views.nested.data/api_write/",
            "{\"method\":\"api_write\",\"params\":{\"kwargs\":{\"data\":[{\"partner\":6,\"author\":1,\"nested2\":[{\"action\":\"CREATE\",\"values\":{\"author\":1,\"nested3\":[{\"action\":\"CREATE\",\"values\":{\"author\":1,\"nested4\":[{\"action\":\"CREATE\",\"values\":{\"name\":\"Albert Einstein\",\"nested5\":[{\"action\":\"CREATE\",\"values\":{\"name\":\"Nested Data\"}}]}}]}}]}}]}]},\"context\":{}}}",
            content_type='application/json'
        )


@override_settings(ROOT_URLCONF='admin_views.urls', DEBUG=True)
class UITestCase(AdminSeleniumTestCase):
    available_apps = [
        'orun.contrib.admin',
        'orun.contrib.contacts',
        'orun.contrib.erp',
        'admin_views',
    ]
    fixtures = {
        'orun.contrib.erp': ['partner.xml', 'views.xml', 'actions.xml', 'menu.xml'],
        'orun.contrib.contacts': ['actions.xml', 'menu.xml'],
        'admin_views': ['data.xml'],
    }




    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from orun.contrib.erp.models import User
        cls.superuser = User.objects.create_superuser(username='super', name='Super', password='secret', email='super@example.com')
        cls.user = User.objects.create(username='user', name='User', password='secret', email='user@localhost', is_staff=True)

    def test_window_action(self):
        from selenium.webdriver.common.keys import Keys
        # test basic window action
        self.selenium.get(self.live_server_url + reverse('admin:login'))
        self.selenium.find_element_by_id('id-username').send_keys('super')
        self.selenium.find_element_by_id('id-password').send_keys('secret')
        self.selenium.find_element_by_css_selector('.btn-primary').click()
        self.wait_until_visible('.navbar-menu-header')
        h = self.selenium.find_element_by_css_selector('.navbar-menu-header')
        self.assertEqual(h.text, 'Contacts')
        btn = self.selenium.find_element_by_css_selector('.btn-action-create')
        btn.click()
        inp = self.selenium.find_element_by_name('name').find_element_by_css_selector('input')
        inp.send_keys('John Doe')
        btn = self.selenium.find_element_by_css_selector('.btn-action-save')
        btn.click()
        self.wait_until_visible('.toast-message', 2)
        msg = self.selenium.find_element_by_css_selector('.toast-message')
        self.assertEqual(msg.text, 'Record saved successfully.')
        self.selenium.find_element_by_css_selector('.toast-close-button').click()
        nav = self.selenium.find_element_by_css_selector('.breadcrumb-item a')
        nav.click()
        nav = self.selenium.find_element_by_css_selector('.breadcrumb-item')
        self.assertEqual(nav.text, 'Contacts')
        inp = self.selenium.find_element_by_css_selector('.search-view-input')
        inp.send_keys('john')
        inp.send_keys(Keys.RETURN)
        sleep(2)
        link = self.selenium.find_element_by_css_selector('.card-link')
        link.click()
        self.wait_until_visible('.btn-action-edit', 2)
        btn = self.selenium.find_element_by_css_selector('.btn-action-edit')
        sleep(1)
        btn.click()
        inp = self.selenium.find_element_by_name('name').find_element_by_css_selector('input')
        inp.send_keys(' Edited')
        btn = self.selenium.find_element_by_css_selector('.btn-action-save')
        btn.click()

        # complex related controls
        # click to menu selector
        self.selenium.find_element_by_id('apps-button').click()
        from orun.contrib.contenttypes.models import Object
        menu_id = Object.get_object('admin_views.admin.menu').content_object.pk
        menuitem = self.selenium.find_element_by_css_selector(f"a[data-menu-id='{menu_id}'")
        menuitem.click()
        # fk tests
        # goto form view
        btn = self.selenium.find_element_by_css_selector('.btn-action-create')
        btn.click()
        self.wait_until_visible("section[name='author']")
        # search using fk autocomplete
        fk_field = self.selenium.find_element_by_name('partner')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        fk_input.send_keys('john doe edited')
        Partner = apps['res.partner']
        partner_pk = pk = Partner.api_search_by_name('john doe edited')['items'][0]['id']
        self.wait_until_visible(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item = self.selenium.find_element_by_css_selector(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item.click()

        # create record from `create new` menu in foreignkey/autocomplete control
        fk_field = self.selenium.find_element_by_name('author')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        self.wait_until_visible('.action-create-new')
        dropdown_item = self.selenium.find_element_by_css_selector('.action-create-new')
        dropdown_item.click()
        self.wait_until_visible(".modal-dialog section[name='name']")
        dlg = self.selenium.find_element_by_css_selector('.modal-dialog')
        name_input = dlg.find_element_by_css_selector("section[name='name']").find_element_by_css_selector('input')
        name_input.send_keys('Charles Darwin')
        btn = dlg.find_element_by_css_selector('.btn-action-save')
        btn.click()
        sleep(1)

        # interact over onetomany field
        fk_field = self.selenium.find_element_by_css_selector('.OneToManyField')
        fk_field.find_element_by_css_selector('.btn-action-add').click()
        self.wait_until_visible('.modal-dialog')
        nested_2 = self.selenium.find_element_by_css_selector('.modal-dialog')
        fk_field = nested_2.find_element_by_name('author')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        fk_input.send_keys('charles darwin')

        author_pk = pk = Author.api_search_by_name('charles darwin')['items'][0]['id']
        self.wait_until_visible(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item = self.selenium.find_element_by_css_selector(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item.click()
        nested_field3 = nested_2.find_element_by_css_selector('.OneToManyField')
        nested_field3.find_element_by_css_selector('.btn-action-add').click()

        # test nested windows
        self.wait_until_visible(".modal[data-model='admin_views.nested.data3']")
        nested_3 = self.selenium.find_element_by_css_selector(".modal[data-model='admin_views.nested.data3']")

        fk_field = nested_3.find_element_by_name('author')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        fk_input.send_keys('charles darwin')
        self.wait_until_visible(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item = self.selenium.find_element_by_css_selector(f".dropdown-item[data-item-id='{pk}']")
        dropdown_item.click()

        nested_field4 = nested_3.find_element_by_css_selector('.OneToManyField')
        nested_field4.find_element_by_css_selector('.btn-action-add').click()

        self.wait_until_visible(".modal[data-model='admin_views.nested.data4']")
        nested_4 = self.selenium.find_element_by_css_selector(".modal[data-model='admin_views.nested.data4']")
        name_field = nested_4.find_element_by_name('name').find_element_by_tag_name('input')
        name_field.click()
        name_field.send_keys('Albert Einstein')
        nested_field5 = nested_4.find_element_by_css_selector('.OneToManyField')
        nested_field5.find_element_by_css_selector('.btn-action-add').click()

        self.wait_until_visible(".modal[data-model='admin_views.nested.data5']")
        nested_5 = self.selenium.find_element_by_css_selector(".modal[data-model='admin_views.nested.data5']")
        name_field = nested_5.find_element_by_name('name').find_element_by_tag_name('input')
        name_field.click()
        name_field.send_keys('Nested Data')
        fk_field = nested_5.find_element_by_name('author')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        nested_5.find_element_by_css_selector('.btn-action-save').click()
        sleep(.5)
        nested_4.find_element_by_css_selector('.btn-action-save').click()
        sleep(.5)
        nested_3.find_element_by_css_selector('.btn-action-save').click()
        sleep(.5)
        nested_2.find_element_by_css_selector('.btn-action-save').click()
        self.selenium.find_element_by_css_selector('.btn-action-save').click()
        sleep(1)
        rec1 = NestedData.objects.first()
        self.assertEqual(rec1.partner_id, partner_pk)
        rec2 = rec1.nested2.first()
        self.assertEqual(rec2.author_id, author_pk)
        rec3 = rec2.nested3.first()
        self.assertEqual(rec3.author_id, author_pk)
        rec4 = rec3.nested4.first()
        self.assertEqual(rec4.name, 'Albert Einstein')
        self.assertIsNone(rec4.author_id)
        rec5 = rec4.nested5.first()
        self.assertEqual(rec5.name, 'Nested Data')
        self.assertIsNone(rec5.author_id)

        # edit the master record
        self.selenium.find_element_by_css_selector('.btn-action-edit').click()
        sleep(2)
        nested_field2 = self.selenium.find_element_by_css_selector('.OneToManyField')
        first_row = nested_field2.find_element_by_css_selector('table tbody tr')
        first_row.click()
        sleep(.5)

        # test onetomany field editing
        self.wait_until_visible(".modal[data-model='admin_views.nested.data2']")
        nested_2 = self.selenium.find_element_by_css_selector(".modal[data-model='admin_views.nested.data2']")
        nested_field3 = nested_2.find_element_by_css_selector('.OneToManyField')
        first_row = nested_2.find_element_by_css_selector('table tbody tr')
        first_row.click()
        sleep(2)

        nested_field3.find_element_by_css_selector('.btn-action-add').click()
        self.wait_until_visible(".modal[data-model='admin_views.nested.data3']")
        nested_3 = self.selenium.find_element_by_css_selector(".modal[data-model='admin_views.nested.data3']")
        fk_field = nested_3.find_element_by_name('author')
        fk_input = fk_field.find_element_by_tag_name('input')
        fk_input.click()
        self.wait_until_visible(f".dropdown-item[data-item-id='{author_pk}']")
        dropdown_item = self.selenium.find_element_by_css_selector(f".dropdown-item[data-item-id='{author_pk}']")
        dropdown_item.click()
        nested_3.find_element_by_css_selector('.btn-action-save').click()
        sleep(.5)
        nested_2.find_element_by_css_selector('.btn-action-save').click()
        sleep(.5)

        # go back to list view
        self.selenium.find_element_by_css_selector('.btn-action-save').click()
        nav = self.selenium.find_element_by_css_selector('.breadcrumb-item a')
        nav.click()
