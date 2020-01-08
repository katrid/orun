from orun import render_template as render
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
