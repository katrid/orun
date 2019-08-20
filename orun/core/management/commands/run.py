import os

from orun.core.management import commands


@commands.command('run', short_help='Runs a development server.')
@commands.option('--host', '-h', default='127.0.0.1',
              help='The interface to bind to.')
@commands.option('--port', '-p', default=5000,
              help='The port to bind to.')
@commands.option('--reload/--no-reload', default=None,
              help='Enable or disable the reloader. By default the reloader is active if debug is enabled.')
@commands.option('--debugger/--no-debugger', default=None,
              help='Enable or disable the debugger.  By default the debugger '
              'is active if debug is enabled.')
@commands.option('--eager-loading/--lazy-loader', default=None,
              help='Enable or disable eager loading. By default eager loading is enabled if the reloader is disabled.')
@commands.option('--with-threads/--without-threads', default=False,
              help='Enable or disable multithreading.')
@commands.option('--websocket', is_flag=True, default=False, help='Enable websocket.')
@commands.option('--gevent-loop', '--gevent', is_flag=True, default=False, help='Gevent loop.')
def command(host, port, reload, debugger, eager_loading, with_threads, websocket, gevent_loop, **kwargs):
    """Runs a local development server for the Flask application.

    This local server is recommended for development purposes only but it
    can also be used for simple intranet deployments.  By default it will
    not support any sort of concurrency at all to simplify debugging.  This
    can be changed with the --with-threads option which will enable basic
    multithreading.

    The reloader and debugger are by default enabled if the debug flag of
    Flask is enabled and disabled otherwise.
    """
    from werkzeug.serving import run_simple

    debug = True
    if reload is None:
        reload = False
    if debugger is None:
        debugger = bool(debug)
    if eager_loading is None:
        eager_loading = not reload

    from flask.globals import _app_ctx_stack
    app = _app_ctx_stack.top.app
    multidb = app.config.get('MULTIDB')
    print('multidb', multidb)

    # Extra startup messages.  This depends a but on Werkzeug internals to
    # not double execute when the reloader kicks in.
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        # If we have an import path we can print it out now which can help
        # people understand what's being served.  If we do not have an
        # import path because the app was loaded through a callback then
        # we won't print anything.
        print(' * Serving Orun app "%s"' % app.import_name)
        if debug:
            print(' * Forcing debug mode %s' % (debug and 'on' or 'off'))

    if websocket:
        from orun import io
        app.config['WEBSOCKET'] = True
        io.socketio.run(app, host, port, debug=True, use_reloader=reload)

    elif gevent_loop:
        from gevent import monkey
        monkey.patch_all()

        from gevent.pywsgi import WSGIServer

        if multidb:
            from orun.apps.factory import CookieDispatcher
            print('Running in multidb mode')
            WSGIServer((host, port), CookieDispatcher(app.settings, app)).serve_forever()
        else:
            print('run in gevent mode')
            WSGIServer((host, port), app.wsgi_app).serve_forever()
    elif multidb:
        from orun.apps.factory import CookieDispatcher
        print('Running in multidb mode')
        run_simple(host, port, CookieDispatcher(app.settings, app), use_reloader=reload, use_debugger=debugger, threaded=with_threads)
    else:
        app.config['WEBSOCKET'] = False
        run_simple(host, port, app, use_reloader=reload, use_debugger=debugger, threaded=with_threads)
