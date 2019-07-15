from flask import request, abort

from orun import app, api
from orun.utils.json import jsonify
from orun.conf import settings
from orun.core.exceptions import MethodNotFound
from orun.db import models, transaction
from orun.db.models.query import Query
from orun.views import BaseView, route
from orun.auth.decorators import login_required, cross_domain


class RPC(BaseView):
    route_base = '/api/'

    @route('/rpc/<service>/<meth>/', methods=['GET', 'POST', 'DELETE', 'PUT'])
    @login_required
    @transaction.atomic
    @api.jsonrpc
    def call(self, service, meth, params):
        data = request.json
        method = data['method']
        if method.startswith('_'):
            raise MethodNotFound
        else:
            kwargs = {}
            args = ()
            for k in request.args.lists():
                if k[0].startswith('_'):
                    continue
            service = app[service]
            meth = getattr(service.__class__, method)
            if getattr(meth, 'exposed', None):
                qs = kwargs

                args = params.get('args', ())
                kwargs = params.get('kwargs', {})
                r = meth(service, *args, **kwargs)

                if isinstance(r, Query):
                    r = {
                        'data': r,
                        'count': getattr(r, '_count__cache', None),
                    }
                elif isinstance(r, models.Model):
                    r = {
                        'data': [r]
                    }
                return r
            else:
                raise MethodNotFound

    @route('/field/choices/<service>/<field>/', methods=['GET'])
    @login_required
    def choices(self, service, field):
        service = app[service]
        field = service._meta.get_field(field)
        service = app[field.related_model._meta.name]
        r = service.search_name(name=request.args.get('q'))
        return {'result': r}

    @route('/app/settings/', methods=['GET'])
    @login_required
    def app_settings(self):
        return {'result': {}}

    @route('/public/query/<int:id>/')
    @cross_domain('*')
    def public_query(self, id=None):
        if settings.PUBLIC_QUERY_ALLOWED:
            Query = app['ir.query']
            q = Query.objects.get(id)
            if q.public:
                return jsonify({'result': Query.read(id)})
        abort(403, 'Permission denied!')


class Auth(BaseView):
    route_base = '/api/auth/'
