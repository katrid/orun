from orun.apps import Application
from flask_socketio import SocketIO, emit


socketio = SocketIO(Application.current_instance, async_mode='gevent')
