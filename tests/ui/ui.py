import os
import time
from urllib import parse

from .base import TestChrome


class TestUI(TestChrome):
    addons = ['contacts', 'demoapp']

    @classmethod
    def setUpClass(cls):
        os.environ['ORUN_ADDONS_PATH'] = os.path.dirname(__file__)

    def test_ui(self):
        url = self.get_server_url()
        url += '/web/'
        self.driver.maximize_window()
        self.driver.get(url)
        with self.app.app_context():
            # find the demo app root menu
            Object = self.app['ir.object']
            btn = self.driver.find_element_by_id('apps-button')
            time.sleep(.5)
            btn.click()
            menu_id = Object.get_by_natural_key('demoapp/menu').object_id
            menu_el = self.driver.find_element_by_id('ui-menu-' + str(menu_id))
            menu_el.click()
            time.sleep(.5)
            # find html element by the id
            Action = self.app['ir.action.window']
            action = Action.from_model('demoapp.all.controls')
            action_id = Object.get_by_natural_key('demoapp/action.window/all.controls').object_id
            # check default action redirection
            qs = parse.parse_qs(self.driver.current_url.split('?', 1)[1])
            # check the action id
            self.assertEqual(qs['action'][0], str(action.pk), str(action_id))
            # check the model name
            self.assertEqual(qs['model'][0], action.model)

            # testing menu click operation
            # return to home page
            self.driver.get(url)
            time.sleep(1)
            btn = self.driver.find_element_by_id('apps-button')
            btn.click()
            menu_el = self.driver.find_element_by_id('ui-menu-' + str(menu_id))
            menu_el.click()
            time.sleep(.5)
            # find the menu at menu bar
            menu_id = Object.get_by_natural_key('demoapp/menu/ui').object_id
            menu_el = self.driver.find_element_by_id('ui-menu-' + str(menu_id))
            menu_el.click()
            time.sleep(.5)
            # find by the child menu item
            menu_id = Object.get_by_natural_key('demoapp/menu/ui/all controls').object_id
            menu_el = self.driver.find_element_by_id('ui-menu-' + str(menu_id))
            time.sleep(1)
            menu_el.click()
            time.sleep(1)
            qs = parse.parse_qs(self.driver.current_url.split('?', 1)[1])
            # check the action id
            self.assertEqual(qs['action'][0], str(action.pk), str(action_id))
            # check the model name
            self.assertEqual(qs['model'][0], action.model)

            time.sleep(1)
            # testing views switching
            btn = self.driver.find_element_by_class_name('toolbutton-action-create')
            btn.click()
            time.sleep(.5)

            # test form validation
            btn = self.driver.find_element_by_class_name('toolbutton-action-save')
            btn.click()
            # check if field req_char_field is validating
            el = self.driver.find_element_by_name('req_char_field')
            self.assertIn('ng-invalid', el.get_attribute('class'))
            el.send_keys('a value')
            time.sleep(.1)
            btn.click()
            time.sleep(.5)

            # check the record id
            qs = parse.parse_qs(self.driver.current_url.split('?', 1)[1])
            self.assertIn('id', qs)
            self.assertEqual(qs['id'][0], '1')

            ##################
            # TEST DASHBOARD #
            ##################

            for i in range(12):
                for x in range(100):
                    pass

            time.sleep(100)


