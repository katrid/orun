import json
from contextlib import contextmanager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

from orun.test import modify_settings
from orun.test.selenium import SeleniumTestCase
from orun.utils.deprecation import MiddlewareMixin
from orun.apps import apps
from orun.db import models


class ApiTestCaseMixin:
    def _api_prep_values(self, model: str, data: dict):
        cls = apps.models[model]
        values = {}
        for k, v in data.items():
            field = cls._meta.fields[k]
            if isinstance(field, models.ForeignKey) and isinstance(v, str):
                v = self.client.rpc(
                    field.model._meta.name, 'api_get_field_choices', {'kwargs': {'field': field.name, 'name': v}}
                ).json()['result']['items'][0]['id']
            elif isinstance(field, models.OneToManyField):
                v = [
                    {'action': 'CREATE', 'values': self._api_prep_values(field.remote_field.model._meta.name, o)}
                    for o in v
                ]
            values[k] = v
        return values

    def api_write(self, model: str, data: dict):
        cls = apps.models[model]
        values = self._api_prep_values(model, data)
        return cls.api_write(values)


class CSPMiddleware(MiddlewareMixin):
    """The admin's JavaScript should be compatible with CSP."""
    def process_response(self, request, response):
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        return response


class AdminTestCaseMixin:
    def run_async_js(self, code: str):
        self.selenium.set_script_timeout(100)
        self.selenium.execute_async_script(f"""var __done = arguments[0];{code}.then(() => __done());""")

    def menu_click(self, *menu):
        menu = [f'"{m}"'for m in menu]
        return self.run_async_js(f'katrid.test.menuClick({",".join(menu)})')

    def tour(self, structure):
        return self.run_async_js(f'katrid.test.runTour({json.dumps(structure)})')

    def model_action_tour(self, structure):
        return self.run_async_js(f'katrid.test.modelActionTour({json.dumps(structure)})')

    def query_selector(self, css_selector: str):
        return self.selenium.find_element(By.CSS_SELECTOR, css_selector)

    def click(self, css_selector: str):
        el = self.query_selector(css_selector)
        el.click()

    def send_keys(self, field: str, text: str, value=None, parent=None):
        if parent:
            el = parent.find_element(By.CSS_SELECTOR, f'.form-field-section[name="{field}"]')
        else:
            el = self.selenium.find_element(By.CSS_SELECTOR, f'.form-field-section[name="{field}"]')
        css_class = el.get_attribute('class')

        if 'ChoiceField' in css_class:
            inp = Select(el.find_element(By.TAG_NAME, 'select'))
            inp.select_by_value(text)
        else:
            inp = el.find_element(By.TAG_NAME, 'input')
            inp.click()
            inp.send_keys(text)
            if 'ForeignKey' in css_class:
                if value is None:
                    selector = ".dropdown-item[data-item-id]"
                else:
                    selector = f".dropdown-item[data-item-id='{value}']"
                self.wait_for(selector)
                dropdown_item = self.selenium.find_element_by_css_selector(selector)
                dropdown_item.click()

    def add_record_to(self, selector, data: dict):
        target = self.selenium.find_element(By.CSS_SELECTOR, selector)
        btn = target.find_element(By.CSS_SELECTOR, '.btn-action-add')
        btn.click()
        dlg = self.wait_for(".modal[data-model]")
        for k, v in data.items():
            self.send_keys(k, str(v), parent=dlg)
        dlg.find_element_by_css_selector('.modal-footer .btn').click()

    def wait_until(self, callback, timeout=10):
        """
        Block the execution of the tests until the specified callback returns a
        value that is not falsy. This method can be called, for example, after
        clicking a link or submitting a form. See the other public methods that
        call this function for more details.
        """
        from selenium.webdriver.support.wait import WebDriverWait
        WebDriverWait(self.selenium, timeout).until(callback)

    def wait_for_and_switch_to_popup(self, num_windows=2, timeout=10):
        """
        Block until `num_windows` are present and are ready (usually 2, but can
        be overridden in the case of pop-ups opening other pop-ups). Switch the
        current window to the new pop-up.
        """
        self.wait_until(lambda d: len(d.window_handles) == num_windows, timeout)
        self.selenium.switch_to.window(self.selenium.window_handles[-1])
        self.wait_page_ready()

    def wait_for(self, css_selector, timeout=10):
        """
        Block until a CSS selector is found on the page.
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        self.wait_until(
            ec.presence_of_element_located((By.CSS_SELECTOR, css_selector)),
            timeout
        )
        return self.query_selector(css_selector)

    def wait_for_text(self, css_selector, text, timeout=10):
        """
        Block until the text is found in the CSS selector.
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        self.wait_until(
            ec.text_to_be_present_in_element(
                (By.CSS_SELECTOR, css_selector), text),
            timeout
        )

    def wait_for_value(self, css_selector, text, timeout=10):
        """
        Block until the value is found in the CSS selector.
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        self.wait_until(
            ec.text_to_be_present_in_element_value(
                (By.CSS_SELECTOR, css_selector), text),
            timeout
        )

    def wait_until_visible(self, css_selector, timeout=10):
        """
        Block until the element described by the CSS selector is visible.
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        self.wait_until(
            ec.visibility_of_element_located((By.CSS_SELECTOR, css_selector)),
            timeout
        )

    def wait_until_invisible(self, css_selector, timeout=10):
        """
        Block until the element described by the CSS selector is invisible.
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as ec
        self.wait_until(
            ec.invisibility_of_element_located((By.CSS_SELECTOR, css_selector)),
            timeout
        )

    def wait_page_ready(self, timeout=10):
        """
        Block until the  page is ready.
        """
        self.wait_until(
            lambda driver: driver.execute_script('return document.readyState;') == 'complete',
            timeout,
        )

    @contextmanager
    def wait_page_loaded(self, timeout=10):
        """
        Block until a new page has loaded and is ready.
        """
        from selenium.webdriver.support import expected_conditions as ec
        old_page = self.selenium.find_element_by_tag_name('html')
        yield
        # Wait for the next page to be loaded
        self.wait_until(ec.staleness_of(old_page), timeout=timeout)
        self.wait_page_ready(timeout=timeout)

    def close_toasts(self):
        for btn in self.selenium.find_elements_by_css_selector(".toast .btn-close"):
            btn.click()

    def set_field_value(self, name, value, parent=None):
        if parent is None:
            parent = self.selenium
        inp = parent.find_element_by_name('qt').find_element_by_tag_name('input')
        inp.click()
        inp.send_keys(str(value))



# @modify_settings(MIDDLEWARE={'append': 'orun.contrib.admin.tests.CSPMiddleware'})
class AdminSeleniumTestCase(SeleniumTestCase, AdminTestCaseMixin):
    available_apps = [
        'orun.contrib.admin',
    ]

    def admin_login(self, username, password, login_url='/admin/'):
        """
        Log in to the admin.
        """
        self.selenium.get('%s%s' % (self.live_server_url, login_url))
        username_input = self.selenium.find_element_by_name('username')
        username_input.send_keys(username)
        password_input = self.selenium.find_element_by_name('password')
        password_input.send_keys(password)
        login_text = _('Log in')
        with self.wait_page_loaded():
            self.selenium.find_element_by_xpath('//input[@value="%s"]' % login_text).click()

    def select_option(self, selector, value):
        """
        Select the <OPTION> with the value `value` inside the <SELECT> widget
        identified by the CSS selector `selector`.
        """
        from selenium.webdriver.support.ui import Select
        select = Select(self.selenium.find_element_by_css_selector(selector))
        select.select_by_value(value)

    def deselect_option(self, selector, value):
        """
        Deselect the <OPTION> with the value `value` inside the <SELECT> widget
        identified by the CSS selector `selector`.
        """
        from selenium.webdriver.support.ui import Select
        select = Select(self.selenium.find_element_by_css_selector(selector))
        select.deselect_by_value(value)

    def _assertOptionsValues(self, options_selector, values):
        if values:
            options = self.selenium.find_elements_by_css_selector(options_selector)
            actual_values = []
            for option in options:
                actual_values.append(option.get_attribute('value'))
            self.assertEqual(values, actual_values)
        else:
            # Prevent the `find_elements_by_css_selector` call from blocking
            # if the selector doesn't match any options as we expect it
            # to be the case.
            with self.disable_implicit_wait():
                self.wait_until(
                    lambda driver: not driver.find_elements_by_css_selector(options_selector)
                )

    def assertSelectOptions(self, selector, values):
        """
        Assert that the <SELECT> widget identified by `selector` has the
        options with the given `values`.
        """
        self._assertOptionsValues("%s > option" % selector, values)

    def assertSelectedOptions(self, selector, values):
        """
        Assert that the <SELECT> widget identified by `selector` has the
        selected options with the given `values`.
        """
        self._assertOptionsValues("%s > option:checked" % selector, values)

    def has_css_class(self, selector, klass):
        """
        Return True if the element identified by `selector` has the CSS class
        `klass`.
        """
        return (self.selenium.find_element_by_css_selector(selector)
                .get_attribute('class').find(klass) != -1)
