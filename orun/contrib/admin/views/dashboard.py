from orun.http import HttpRequest, JsonResponse
from orun.contrib.auth.decorators import login_required
from orun.contrib.admin import registry


@login_required
def index(request: HttpRequest, service):
    cls = registry[service]
    dash = cls()
    res = dash.render(request)
    data = dash.data()
    params = dash.params()
    return JsonResponse({'content': res, 'data': data, 'params': params})


def rpc(request: HttpRequest, service, method):
    cls = registry[service]
    dash = cls()
    data = request.json
    meth = getattr(dash, method)
    args = data.get('args') or []
    kwargs = data.get('kwargs') or {}
    res = meth(*args, **kwargs)
    return JsonResponse({'result': res})
