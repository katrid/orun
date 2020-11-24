from orun.shortcuts import render
from orun.apps import apps
from orun.http import JsonResponse
from orun.contrib.auth.decorators import login_required
import orun.contrib.admin.views.client


@login_required
def index(request):
    return orun.contrib.admin.views.client.index(request, template_name='pwa/index.jinja2', pwa=True)


def service_worker_js(request, template_name='pwa/service-worker.js'):
    return render(request, template_name, content_type='application/javascript')


def manifest_json(request, template_name='pwa/manifest.json'):
    return render(request, template_name, content_type='text/json')


def sync(request):
    """
    Upload received data to database
    :param request:
    :return:
    """
    PwaSync = apps['pwa.sync']
    data = request.json
    objs = data['data']
    res = []
    for obj in objs:
        svc = obj['service']
        values = {k: v for k, v in obj['data'].items() if not k.startswith('$')}
        uid = values.pop('uuid')
        try:
            obj_id = PwaSync.objects.get(uuid=uid).object_id
            res.append({'id': obj_id, '$id': obj['$id'], 'status': 'ok'})
        except PwaSync.DoesNotExist:
            obj_id = PwaSync.sync(svc, values)[0]
        res.append({'id': obj_id, '$id': obj['$id'], 'status': 'ok'})
    return JsonResponse({'ok': True, 'result': res})
