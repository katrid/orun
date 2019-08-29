import sys
import json
from importlib import import_module
from flask import Flask, request
from gevent.pywsgi import WSGIServer


from orun.utils import reraise


def import_string(dotted_path):
    """
    Import a dotted module path and return the attribute/class designated by the
    last name in the path. Raise ImportError if the import failed.
    """
    try:
        module_path, class_name = dotted_path.rsplit('.', 1)
    except ValueError:
        msg = "%s doesn't look like a module path" % dotted_path
        reraise(ImportError, ImportError(msg), sys.exc_info()[2])

    module = import_module(module_path)

    try:
        return getattr(module, class_name)
    except AttributeError:
        msg = 'Module "%s" does not define a "%s" attribute/class' % (
            module_path, class_name)
        reraise(ImportError, ImportError(msg), sys.exc_info()[2])


app = Flask('report-server')
app.REPORT_ENGINES = {
    'default': 'orun.reports.engines.chrome',
}


@app.route('/report/export/', methods=['POST'])
def export_report():
    data = request.json
    engine = import_string(app.REPORT_ENGINES[data['engine']])
    file = engine.run(data)
    return file


if __name__ == '__main__':
    if len(sys.argv) > 1:
        cfg_file = sys.argv[1]
        with open(cfg_file, 'rb') as f:
            cfg = json.load(f)
    else:
        cfg = {}
    if 'engines' in cfg:
        app.REPORT_ENGINES.update(cfg['engines'])
    host = cfg.get('host', '127.0.0.1')
    port = cfg.get('port', 55005)
    server = WSGIServer((host, port), app)
    server.serve_forever()
