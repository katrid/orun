import os
from os import path
import shutil
import jinja2

import orun
import orun.conf
from orun.core.management import commands


@commands.command('startapp')
@commands.argument('name', nargs=1, required=True)
@commands.argument('directory', nargs=1, required=False)
def command(name, directory=None, **options):
    template_dir = os.path.join(os.path.dirname(orun.conf.__file__), 'app_template')
    if directory is None:
        directory = path.join(os.getcwd(), name)
    else:
        directory = os.path.join(os.path.abspath(path.expanduser(directory)), name)

    shutil.copytree(template_dir, directory)
    env = jinja2.Environment()

    context = {
        'app_name': name,
    }

    for dirname, _, files in os.walk(directory):
        for f in files:
            f = os.path.join(dirname, f)
            if f.endswith('.jinja2'):
                with open(f, 'r') as file_r:
                    s = env.from_string(file_r.read()).render(context)
                    with open(f.rsplit('.jinja2', 1)[0], 'w') as file_w:
                        file_w.write(s)
                os.remove(f)
