from orun import app, request
from orun.views import BaseView, route
from orun.utils.json import jsonify


@route('/model/choices/', methods=['POST'])
def model_choices(self):
    data = request.json
    model = app[data['model']]
    model_field = data['kwargs'].get('model_field')
    if model_field:
        model_field = model._meta.fields[model_field]
        print(model_field)
    return jsonify(model.search_name(name=data.get('q'), count=data.get('count'), page=data.get('page')))
