import inspect
from functools import partial, wraps
import builtins

from orun.http import HttpRequest
from orun.http.response import HttpResponseBase
from orun.db.models.base import ModelBase, Model
from orun.core.exceptions import RPCError, ValidationError, ObjectDoesNotExist


class RecordProxy:
    def __init__(self, model, iterable=None, env=None):
        self.__dict__['env'] = env
        self.__dict__['__model__'] = model
        self.__dict__['__instance__'] = iterable

    def __iter__(self):
        if self.__instance__ is None:
            return []
        return iter(self.__instance__)

    def __getitem__(self, item):
        return self.__instance__[item]

    def __setitem__(self, key, value):
        self.__instance__[key] = value

    def __getattr__(self, item):
        return getattr(self.__instance__, item)

    def __setattr__(self, key, value):
        setattr(self.__instance__, key, value)

    def __call__(self, *args, **kwargs):
        return self.__instance__.__call__(self.env, *args, **kwargs)


def _register_method(fn, meth_name, pass_request=False):
    fn.exposed = True
    fn.pass_request = pass_request
    fn = builtins.classmethod(fn)
    fn.meth_name = meth_name
    fn.exposed = True
    fn.pass_request = pass_request
    return fn


def classmethod(name_or_fn):
    if callable(name_or_fn):
        name_or_fn.pass_request = None
        return _register_method(name_or_fn, name_or_fn.__name__)
    if isinstance(name_or_fn, str):
        return partial(_register_method, meth_name=name_or_fn)


def method(*args, select=None, each=None, request=None):

    def decorator(fn, meth_name=None):
        meth_name = meth_name or fn.__name__

        @wraps(fn)
        def wrapped(self, *args, **kwargs):
            if 'id' in kwargs and not args:
                args = kwargs.pop('id')
            if args:
                arg = args[0]
                args = args[1:]
                objs = None
                # simulate orm
                if inspect.isclass(self):
                    if select:
                        objs = self.select(*select)
                    else:
                        objs = self.select()
                single = False
                if isinstance(arg, list):
                    objs = objs.filter(pk__in=arg)
                else:
                    objs = objs.filter(pk=arg)
                    single = True
                if each or (each is None and not single):
                    return [fn(obj, *args, **kwargs) for obj in objs]
                elif single:
                    return fn(objs.first(), *args, **kwargs)
                else:
                    return fn(objs, *args, **kwargs)
            elif isinstance(self, Model):
                return fn(self, *args, **kwargs)

        return _register_method(wrapped, meth_name, pass_request=request)

    arg = args and args[0]
    if isinstance(arg, str):
        meth_name = arg
        return partial(decorator, meth_name=meth_name)
    elif callable(arg):
        meth_name = arg.__name__
        return decorator(arg, meth_name)
    return decorator


def onchange(*fields):
    def decorator(fn):

        def contribute_to_class(flds, cls, name: str):
            if not isinstance(flds, (tuple, list)):
                flds = [flds]
            for field in flds:
                if not isinstance(field, str):
                    field = field.name
                lst = cls._meta.field_change_event[field]
                if fn not in lst:
                    lst.append(fn)
            setattr(cls, name, fn)

        fn.contribute_to_class = partial(contribute_to_class, fields)
        return fn

    return decorator


def serialize(*args, **kwargs):
    def decorator(fn):
        fn.exposed = True

        @wraps(fn)
        def wrapped(*args, **kwargs):
            r = fn(*args, **kwargs)
            if r:
                r.__serialize__ = True
            return r
        return wrapped

    if args and callable(args[0]):
        return decorator(args[0])
    return decorator


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
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'result': r
            })
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
                    'message': str(e)
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

