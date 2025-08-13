#!/usr/bin/env python
import os
import argparse
import orun
from orun.apps import apps
from orun.test.runner import DiscoverRunner


def get_test_modules():
    modules = []
    for f in os.scandir(os.path.dirname(__file__)):
        if f.is_dir() and not f.name.startswith('_') and os.path.isfile(os.path.join(f.path, '__init__.py')):
            print(f.name)
            modules.append(f.name)
    return modules


def setup():
    orun.setup()
    test_modules = get_test_modules()
    apps.set_installed_apps(test_modules)
    return test_modules


def run_tests():
    test_modules = setup()
    runner = DiscoverRunner()
    runner.run_tests(test_modules)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Orun test suite.")
    parser.add_argument(
        'modules', nargs='*', metavar='module',
        help='Optional path(s) to test modules; e.g. "i18n" or '
             '"i18n.tests.TranslationTests.test_lazy_objects".',
    )
    parser.add_argument(
        '-v', '--verbosity', default=1, type=int, choices=[0, 1, 2, 3],
        help='Verbosity level; 0=minimal output, 1=normal output, 2=all output',
    )
    parser.add_argument(
        '--noinput', action='store_false', dest='interactive',
        help='Tells Orun to NOT prompt the user for input of any kind.',
    )
    parser.add_argument(
        '--failfast', action='store_true',
        help='Tells Orun to stop running the test suite after first failed test.',
    )
    parser.add_argument(
        '-k', '--keepdb', action='store_true',
        help='Tells Orun to preserve the test database between runs.',
    )
    parser.add_argument(
        '--settings',
        help='Python path to settings module, e.g. "myproject.settings". If '
             'this isn\'t provided, either the ORUN_SETTINGS_MODULE '
             'environment variable or "test_sqlite" will be used.',
    )
    parser.add_argument(
        '--debug-sql', action='store_true',
        help='Turn on the SQL query logger within tests.',
    )
    parser.add_argument(
        '--tag', dest='tags', action='append',
        help='Run only tests with the specified tags. Can be used multiple times.',
    )
    parser.add_argument(
        '--exclude-tag', dest='exclude_tags', action='append',
        help='Do not run tests with the specified tag. Can be used multiple times.',
    )

    options = parser.parse_args()
    os.environ.setdefault('ORUN_SETTINGS_MODULE', 'test_sqlite')

    run_tests()
