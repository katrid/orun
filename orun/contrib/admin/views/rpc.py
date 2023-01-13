from functools import wraps
from orun.core.exceptions import ValidationError, RPCError, ObjectDoesNotExist
from orun.http.response import HttpResponseBase
import orun.messages


def jsonrpc(fn):

    @wraps(fn)
    def wrapped(request, *args, **kwargs):
        from orun.http import JsonResponse
        data = request.json
        _id = None
        kwargs['params'] = data.get('params')
        try:
            r = fn(request, *args, **kwargs)
            if isinstance(r, HttpResponseBase):
                return r

            msgs = orun.messages.get()
            res = {
                'jsonrpc': '2.0',
                'id': _id,
                'result': r,
            }
            if msgs is not None:
                # add katrid.admin.processMessages Response Processor (should be evaluated by client-side)
                res['katrid.admin.ResponseMessagesProcessor'] = msgs

            return JsonResponse(res)
        except ValidationError as e:
            code = getattr(e, 'code', None)
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'error': {
                    'code': code,
                    'messages': getattr(e, 'error_dict', list(e)),
                }
            })
        except RPCError as e:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'error': {
                    'code': e.code,
                    'messages': [str(e)]
                }
            })
        except ObjectDoesNotExist as e:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'error': {
                    'message': str(e)
                }
            })
        except AssertionError as e:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'error': {
                    'message': str(e),
                }
            })
        except:
            raise

    return wrapped

