from orun.test import TestCase

from .models import Category, Partner


class NewQueryStyleTestCase(TestCase):
    def test_query_style(self):
        for i in range(10):
            Category.objects.create(name=f'Category {i}')

        with self.assertNumQueries(1):
            ids = list(Category.objects.select('pk'))
        self.assertEqual(len(ids), 10)

        with self.assertNumQueries(1):
            self.assertEqual(ids[0].name, 'Category 0')
            self.assertEqual(ids[0].name, 'Category 0')

    def test_parent_path(self):
        Category.objects.create(name='Category 1')
