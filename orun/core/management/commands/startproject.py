import os
import sys
from importlib import import_module
import click
import jinja2

from orun.core.management.utils import get_random_secret_key
from orun.core.management.base import CommandError
from orun import conf


@click.command('startproject')
@click.argument(
    'project_name', nargs=1, required=False,
)
def command(project_name, **options):
    project_name, target = options.pop('name'), options.get('directory')
    validate_name(project_name, "project")

    # Check that the project_name cannot be imported.
    try:
        import_module(project_name)
    except ImportError:
        pass
    else:
        raise CommandError(
            "%r conflicts with the name of an existing Python module and "
            "cannot be used as a project name. Please try another name." % project_name
        )

    # Create a random SECRET_KEY to put it in the main settings.
    secret_key = get_random_secret_key()

    env = jinja2.Environment()
    templ = env.from_string(
        open(os.path.join(os.path.dirname(conf.__file__), 'project_template', 'manage.py.tpl')).read()
    )
    s = templ.render(secret_key=secret_key, project_name=project_name)
    if target is None:
        dirname = os.path.join(os.getcwd(), project_name)
        os.makedirs(dirname)
    else:
        dirname = os.path.abspath(os.path.expanduser(target))
        if not os.path.exists(dirname):
            raise CommandError("Destination directory '%s' does not "
                               "exist, please create it first." % dirname)
    filename = os.path.join(dirname, 'manage.py')
    open(filename, 'w').write(s)
