from orun import render_template as render, request, app
from orun.utils.json import jsonify
from orun.http import Response
from orun.views import BaseView, route
from orun.auth.decorators import login_required

import web.views.client


class PWA(BaseView):
    route_base = '/pwa/'

    @login_required
    def index(self):
        return web.views.client.index(template_name='pwa/index.jinja2', pwa=True)

    @route('service-worker.js')
    def service_worker_js(self):
        return Response(render('pwa/service-worker.js'), content_type='application/javascript')

    @route('manifest.json')
    def manifest_json(self):
        return Response(render('pwa/manifest.json'), content_type='text/json')

    @route('/sync/', methods=['POST'])
    def sync(self):
        data = request.json
        objs = data['data']
        res = []
        for obj in objs:
            svc = app[obj['service']]
            values = {k: v for k, v in obj['data'].items() if not k.startswith('$')}
            r = svc.write(values)
            res.append({'id': r[0], '$id': obj['$id'], 'status': 'ok'})
        return jsonify({'ok': True, 'result': res})
