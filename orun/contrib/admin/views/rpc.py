from functools import wraps
import logging
import traceback
from orun.core.exceptions import ValidationError, RPCError, ObjectDoesNotExist
from orun.db.utils import DatabaseError
from orun.http.response import HttpResponseBase
from orun.db import transaction, connection
import orun.messages

logger = logging.getLogger('admin')


def jsonrpc(fn):
    @wraps(fn)
    def wrapped(request, *args, **kwargs):
        from orun.http import JsonResponse
        data = request.json
        kwargs['params'] = data.get('params')
        res: dict = {
            'jsonrpc': '2.0',
            'id': data.get('id'),
        }
        try:
            with transaction.atomic():
                try:
                    r = fn(request, *args, **kwargs)
                    if isinstance(r, HttpResponseBase):
                        return r

                    res['result'] = r
                finally:
                    if msgs := orun.messages.get():
                        # add katrid.admin.processMessages Response Processor (should be evaluated by client-side)
                        res['katrid.admin.ResponseMessagesProcessor'] = msgs
                    # extract notices from the connection
                    if notices := connection.get_notices():
                        res['notices'] = [
                            {'type': t.lower(), 'message': s.strip()}
                            for t, s in [n.split(':', 1) for n in notices]
                        ]
        except ValidationError as e:
            traceback.print_exc()
            code = getattr(e, 'code', None)
            res['error'] = {
                'code': code,
                'messages': getattr(e, 'error_dict', list(e)),
            }
        except DatabaseError as e:
            logger.exception('API DatabaseError')
            res['error'] = {
                'messages': [str(e)]
            }
        except RPCError as e:
            logger.exception('API RPCError')
            res['error'] = {
                'code': e.code,
                'messages': [str(e)]
            }
        except Exception as e:
            logger.exception('API')
            res['error'] = {
                'message': str(e),
            }
        return JsonResponse(res)

    return wrapped
