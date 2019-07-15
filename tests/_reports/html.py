from unittest import TestCase
import jinja2


class HtmlTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.env = jinja2.Environment(loader=jinja2.FileSystemLoader('templates'))

    def test_render(self):
        templ = self.env.get_template('simple-report.html')
        rep = templ.render()
        print(rep)
