from orun import app, request
from orun.views import BaseView, route
from orun.utils.json import jsonify


class Reports(BaseView):
    route_base = '/api/reports/'

    @route('/model/choices/', methods=['POST'])
    def model_choices(self):
        data = request.json
        print(data)
        model = app[data['model']]
        return jsonify(model.search_name(name=data.get('q'), count=data.get('count'), page=data.get('page')))
