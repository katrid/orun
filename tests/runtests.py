import importlib.util
import os
import pkgutil
import unittest
import click


def orun_tests():
    suite = unittest.TestSuite()
    modules = [pkg for pkg in pkgutil.iter_modules([os.path.dirname(__file__)])]
    tests = []
    for mod in modules:
        if mod.name.startswith('_'):
            continue
        if mod.ispkg:
            test_name = mod.name + '.tests'
            if importlib.util.find_spec(test_name):
                tests.append(test_name)
    for t in tests:
        suite.addTest(unittest.defaultTestLoader.loadTestsFromName(t))
    unittest.TextTestRunner().run(suite)


@click.command()
def main():
    orun_tests()


if __name__ == '__main__':
    main()
