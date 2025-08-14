from unittest import TestCase


class JsonFieldTestCase(TestCase):
    def test_json_field(self):
        from .models import Author, BookWithRecordField
        author = Author(name='John Doe', details={'age': 30, 'bio': 'An author.'})
        author.save()
        self.assertEqual(author.name, 'John Doe')
        self.assertEqual(author.details, {'age': 30, 'bio': 'An author.'})
        author.refresh_from_db()
        self.assertIsInstance(author.details, dict)
        self.assertTrue(Author.objects.filter(details__age=30).exists())

        book = BookWithRecordField.objects.create(title='Sample Book', details={
            'author': author.id,
            'isbn': '1234567890123',
            'published_date': '2023-01-01',
            'summary': 'A sample book summary.'
        })
        book.refresh_from_db()
        self.assertEqual(book.title, 'Sample Book')
        self.assertEqual(book.details['isbn'], '1234567890123')
        self.assertEqual(book.details['author'], author.id)

