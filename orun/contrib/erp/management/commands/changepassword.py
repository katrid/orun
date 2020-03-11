from orun import app
from orun.core.management import commands
from orun.db import connections, DEFAULT_DB_ALIAS


@commands.command('changepassword')
@commands.argument(
    'username', nargs=1, required=False,
    #help='App label of an addon to synchronize the state.',
)
@commands.argument(
    'password', nargs=-1,
)
def command(database, username, **options):
    if database:
        from sqlalchemy.engine.url import make_url
        url = make_url(app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'])
        url.database = database
        app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'] = str(url)

    if not options.get('password'):
        password = commands.prompt('New Password', hide_input=True)
    elif 'password' in options:
        password = options['password']
        if isinstance(password, (list, tuple)):
            password = password[0]
    user = app['auth.user']
    u = user.objects.filter(user.c.username == username).one()
    u.set_password(password)
    u.save()
    commands.echo('The password has been changed.')
