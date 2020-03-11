from orun import app
from orun.core.management import commands
from orun.db import connections, DEFAULT_DB_ALIAS


@commands.command('createsuperuser')
def command(database, **options):
    with app.app_context(db=database):
        name = commands.prompt('Name')
        username = commands.prompt('Login')
        password = commands.prompt('Password', hide_input=True)
        User = app['auth.user']
        u = User(name=name, username=username, is_staff=True, is_superuser=True)
        u.set_password(password)
        u.save()
        commands.echo('User successfully created!')
