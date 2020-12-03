from functools import partial
from functools import wraps

from orun.core.exceptions import RPCError, ValidationError


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




def method(fn) -> classmethod:
    fn.exposed = True
    fn = classmethod(fn)
    return fn


def records(*args, each=False, **kwargs):
    from orun.db import models

    def decorator(fn):
        fn.exposed = True

        @wraps(fn)
        def wrapped(self, *args, **kwargs):
            ids = None
            kwargs = dict(kwargs)
            if isinstance(self, list):
                self = RecordProxy(self)
            if self._state is not None and self.pk:
                return fn(self, *args, **kwargs)
            elif 'id' in kwargs:
                ids = [kwargs.pop('id')]
            elif args:
                args = list(args)
                ids = args[0]
                args = args[1:]
            if not ids and not issubclass(self, models.Model):
                ids = (self,)
            elif ids:
                # if the object is a dict
                # create a new record instance
                if isinstance(ids, dict):
                    ids = [self(**ids)]
                else:
                    if not isinstance(ids, list):
                        ids = [ids]
                    ids = self.objects.filter(self.c.pk.in_(kwargs.pop('ids', ids)))
            if not isinstance(ids, RecordsProxy):
                ids = RecordsProxy(self, ids)
            if each:
                for id in ids:
                    return fn(id, *args, **kwargs)
            else:
                return fn(ids, *args, **kwargs)
        return wrapped

    if args and callable(args[0]):
        return decorator(args[0])
    return decorator


record = partial(records, each=True)


def onchange(*fields):
    def decorator(fn):

        def contribute_to_class(flds, cls, name: str):
            if not isinstance(flds, (tuple, list, dict)):
                flds = [flds]
            for field in flds:
                if not isinstance(field, str):
                    field = field.name
                lst = cls._meta.__class__.field_change_event[field]
                if fn not in lst:
                    lst.append(fn)

        # fn._onchange = fields
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
                    'messages': e.message_dict,
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
        except AssertionError as e:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': _id,
                'error': {
                    'message': str(e),
                }
            })

    return wrapped

