from orun.test import TestCase
from orun.apps import apps
from orun.db import connection


class FixturesTest(TestCase):
    fixtures = {
        'fixtures': [
            'fixtures.author.csv', 'fixtures.author.tsv', 'data.xml', 'fixtures.book.tsv', 'fixtures.book.csv',
            'metadata.%(db_vendor)s.sql',
        ],
    }

    def test_load_data(self):
        Author = apps['fixtures.author']
        Book = apps['fixtures.book']
        objs = list(Author.objects.all())
        self.assertEqual(len(objs), 9)
        book = Book.objects.get(pk=1)
        self.assertEqual(book.author.name, 'Xml Author 1')
        book = Book.objects.get(pk=2)
        self.assertEqual(book.author.name, 'Author 2')

    def test_xml_objects(self):
        Object = apps['ir.object']
        obj1 = Object.objects.get_object('fixtures/xml/author/1')
        self.assertEqual(obj1.name, 'fixtures/xml/author/1')
        author1 = obj1.content_object
        self.assertEqual(author1.name, 'Xml Author 1')
        self.assertEqual(obj1.name, 'fixtures/xml/author/1')
        obj2 = Object.objects.get_object('fixtures/xml/author/2')
        author2 = obj2.content_object
        self.assertEqual(obj2.name, 'fixtures/xml/author/2')
        self.assertEqual(author2.name, 'Xml Author 2')

        # test deleted
        with self.assertRaises(Object.DoesNotExist):
            Object.objects.get_object('fixtures/xml/author/4/delete')
        Author = apps['fixtures.author']
        with self.assertRaises(Author.DoesNotExist):
            Author.objects.get(name='Xml Author 4')

    def test_sql_fixtures(self):
        with connection.cursor() as cursor:
            # Testing created view
            cursor.execute('''select * from books order by id''')
            books = cursor.fetchall()
            self.assertEqual(len(books), 2)
            self.assertEqual(books[0][0], 1)
            self.assertEqual(books[1][0], 2)

    def test_web_fixtures(self):
        View = apps['ui.view']
        views = View.objects.all()
