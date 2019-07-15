import click
from click import argument, option, UsageError, echo, prompt, confirm
from orun.db import DEFAULT_DB_ALIAS
from orun.core.management import color


class CommandError(UsageError):
    pass


style = color.color_style()


def command(name=None, cls=None, **attrs):

    def decorator(fn):
        fn = click.option(
            '-v', '--verbosity',
            type=click.Choice([0, 1, 2, 3]), default=1,
            help='Verbosity level; 0=minimal output, 1=normal output, 2=verbose output, 3=very verbose output',
        )(fn)

        fn = click.option(
            '--pythonpath',
            help='A directory to add to the Python path, e.g. "/home/orunprojects/myproject".',
        )(fn)

        fn = click.option(
            '--database',
            help='Nominates a database to create. Defaults to the "default" database.',
        )(fn)
        return click.command(name=name, cls=cls, **attrs)(fn)

    return decorator
