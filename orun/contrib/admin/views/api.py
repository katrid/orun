import os
import datetime
from functools import wraps

from orun import api
from orun.db.models import QuerySet
from orun.conf import settings
from orun.core.exceptions import MethodNotFound
from orun.db import models, transaction
from orun.contrib.auth.decorators import login_required
from orun.apps import apps
from orun.http import HttpResponse, JsonResponse, HttpResponseForbidden, HttpRequest, Http404
from .rpc import jsonrpc


def _get_log_filename(svc: str):
    s = os.path.join(settings.LOG_DIR, 'orun', svc)
    if not os.path.isdir(s):
        os.makedirs(s)
    return os.path.join(s, 'api.log.json')


def _get_log_file(svc: str):
    return open(_get_log_filename(svc), 'a')


IGNORED_METHODS = [
    'api_search', 'api_get', 'api_get_field_choices', 'api_group_by', 'api_copy', 'api_get_field_choice',
    'api_on_field_change', 'admin_get_formview_action', 'load',
]


@login_required
@jsonrpc
def rpc(request, service, meth, params):
    data = request.json
    method = data.get('method', meth)
    if not method.startswith('_'):
        kwargs = {}
        args = ()
        model_name = service
        service = apps.services[service]
        meth = getattr(service, method)
        if getattr(meth, 'exposed', None):
            try:
                logger = None
                if settings.LOG_DIR and method not in IGNORED_METHODS:
                    logger = _get_log_file(model_name)
                    logger.write(f"""{{"timestamp": {str(datetime.datetime.now())},"request": {request.body.decode('utf-8')}}}\n""")

                # api logging
                args = params.get('args') or []
                kwargs = params.get('kwargs') or {}
                if getattr(meth, 'pass_request', False):
                    # inspect if the method needs to receive de request arg
                    r = meth(request, *args, **kwargs)
                else:
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
            finally:
                if logger:
                    logger.close()
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


def admin_report_api(request: HttpRequest, qualname: str):
    from orun.contrib.admin.models.reports import ReportAction
    rep = ReportAction.objects.only('pk').filter(qualname=qualname).first()
    if rep:
        params = request.json
        return JsonResponse(rep(request, params))
    raise Http404('Report not found')
