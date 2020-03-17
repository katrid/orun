from orun.shortcuts import render
from orun.apps import apps
from orun.http import JsonResponse
from orun.contrib.auth.decorators import login_required
import orun.contrib.web.views.client


@login_required
def index(request):
    return orun.contrib.web.views.client.index(request, template_name='pwa/index.jinja2', pwa=True)


def service_worker_js(request):
    return render(request, 'pwa/service-worker.js', content_type='application/javascript')


def manifest_json(request):
    return render(request, 'pwa/manifest.json', content_type='text/json')


def sync(request):
    data = request.json
    objs = data['data']
    res = []
    for obj in objs:
        svc = apps[obj['service']]
        values = {k: v for k, v in obj['data'].items() if not k.startswith('$')}
        r = svc.write(values)
        res.append({'id': r[0], '$id': obj['$id'], 'status': 'ok'})
    return JsonResponse({'ok': True, 'result': res})
