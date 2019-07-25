import os
import sys

from orun.db import DEFAULT_DB_ALIAS
from orun.core.management import commands


@commands.command('shell')
def command(database, **options):
    """Runs an interactive Python shell in the context of a given
    Flask application.  The application will populate the default
    namespace of this shell according to it's configuration.

    This is useful for executing small snippets of management code
    without having to manually configuring the application.
    """
    if database:
        from orun import app
        from sqlalchemy.engine.url import make_url
        url = make_url(app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'])
        url.database = database
        app.settings['DATABASES'][DEFAULT_DB_ALIAS]['ENGINE'] = str(url)

    import code
    from flask.globals import _app_ctx_stack
    app = _app_ctx_stack.top.app
    banner = 'Python %s on %s\nApp: %s%s\nInstance: %s' % (
        sys.version,
        sys.platform,
        app.import_name,
        app.debug and ' [debug]' or '',
        app.instance_path,
    )
    ctx = {}

    # Support the regular Python interpreter startup script if someone
    # is using it.
    startup = os.environ.get('PYTHONSTARTUP')
    if startup and os.path.isfile(startup):
        with open(startup, 'r') as f:
            eval(compile(f.read(), startup, 'exec'), ctx)

    ctx.update(app.make_shell_context())

    code.interact(banner=banner, local=ctx)
