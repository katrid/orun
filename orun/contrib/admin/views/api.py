import inspect
from orun import api
from orun.db.models import QuerySet
from orun.conf import settings
from orun.core.exceptions import MethodNotFound
from orun.db import models, transaction
from orun.contrib.auth.decorators import login_required
from orun.apps import apps
from orun.http import HttpResponse, JsonResponse, HttpResponseForbidden, HttpRequest


@login_required
@transaction.atomic
@api.jsonrpc
def rpc(request, service, meth, params):
    data = request.json
    method = data.get('method', meth)
    if not method.startswith('_'):
        kwargs = {}
        args = ()
        service = apps.services[service]
        meth = getattr(service, method)
        if getattr(meth, 'exposed', None) or (method == 'admin_do_view_action'):
            qs = kwargs

            args = params.get('args') or []
            kwargs = params.get('kwargs') or {}
            if getattr(meth, 'pass_request', False) or (method == 'admin_do_view_action'):
                # inspect if the method needs to receive de request arg
                kwargs['request'] = request
            r = meth(*args, **kwargs)

            if isinstance(r, list) and r and isinstance(r[0], HttpResponse):
                return r[0]
            elif isinstance(r, HttpResponse):
                return r

            if isinstance(r, QuerySet):
                r = {
                    'data': r,
                    'count': getattr(r, '_count__cache', None),
                }
            elif isinstance(r, models.Model):
                r = {'data': [r]}
            return r
    raise MethodNotFound


@login_required
@transaction.atomic
def view_model(request: HttpRequest, service: str):
    """
    Return a rendered view object for a given model
    :param request:
    :param service:
    :return:
    """
    cls = apps.models[service]
    views_info = cls.admin_load_views()
    return JsonResponse({
        'type': 'ui.action.window',
        'caption': cls._meta.verbose_name,
        'model': service,
        'viewModes': ['list', 'form', 'search'],
        'viewsInfo': views_info['views'],
        'fields': views_info['fields'],
    })
    return JsonResponse(views)
    print('get view', views);
    if request.method == 'GET':
        res = service.get(request)
        if isinstance(res, (dict, list, tuple)):
            res = JsonResponse(res)
        elif not isinstance(res, HttpResponse):
            res = HttpResponse(res, content_type=service.content_type)
        return res


@login_required
@transaction.atomic
def view(request: HttpRequest, service: str):
    """
    Return a rendered view object
    :param request:
    :param service:
    :return:
    """
    cls = apps.services[service]
    service = cls()
    print('get view', service, request.mehtod)
    if request.method == 'GET':
        res = service.get(request)
        if isinstance(res, (dict, list, tuple)):
            res = JsonResponse(res)
        elif not isinstance(res, HttpResponse):
            res = HttpResponse(res, content_type=service.content_type)
        return res


@login_required
def choices(request, service, field):
    service = apps.services[service]
    field = service._meta.get_field(field)
    service = apps[field.related_model._meta.name]
    r = service.search_by_name(name=request.args.get('q'))
    return {'result': r}


@login_required
def app_settings(request):
    return {'result': {}}


@login_required
def public_query(request, id=None):
    if settings.PUBLIC_QUERY_ALLOWED:
        Query = apps['ir.query']
        q = Query.objects.get(id)
        if q.public:
            return JsonResponse({'result': Query.read(id)})
    return HttpResponseForbidden('Permission denied!')

