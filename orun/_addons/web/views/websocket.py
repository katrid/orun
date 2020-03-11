import json
from sqlalchemy.orm import Query
from orun.utils.json import OrunJSONEncoder
from orun import app
from orun.db import models
from orun.io import socketio, emit


@socketio.on('connect', namespace='/rpc')
def connect():
    print('New socketio connection')

@socketio.on('disconnect', namespace='/rpc')
def disconnect():
    print('disconnect socketio')


@socketio.on('api', namespace='/rpc')
def call(message):
    req = message['req-id']
    req_method = message['req-method']
    service = message['service']
    method = message['method']
    data = message.get('data')
    if data:
        args = data.get('args')
        if args is None or isinstance(args, dict):
            args = ()
        kwargs = data.get('kwargs')
        if kwargs is None:
            kwargs = {}
    else:
        kwargs = {}
        args = ()
    service = app[service]
    meth = getattr(service, method)
    res = meth(*args, **kwargs)
    if isinstance(res, Query):
        res = {
            'data': res,
            'count': getattr(res, '_count__cache', None),
        }
    elif isinstance(res, models.Model):
        res = {
            'data': [res]
        }
    try:
        res = json.dumps({
            'ok': True,
            'status': 'ok',
            'req-id': req,
            'result': res,
        }, cls=OrunJSONEncoder)
    except:
        import traceback, sys
        traceback.print_exc(file=sys.stdout)
    emit(
        'api',
        res,
    )
