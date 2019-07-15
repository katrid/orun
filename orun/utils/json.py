import json

from orun import app, request
from orun.core.serializers.json import OrunJSONEncoder


def jsonify(data, cls=OrunJSONEncoder):
    indent = None
    separators = (',', ':')

    if app.config['JSONIFY_PRETTYPRINT_REGULAR'] and not request.is_xhr:
        indent = 2
        separators = (', ', ': ')

    return app.response_class(
        (json.dumps(data, indent=indent, separators=separators, cls=cls, check_circular=False), '\n'),
        mimetype=app.config['JSONIFY_MIMETYPE']
    )

