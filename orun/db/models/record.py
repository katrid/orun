import inspect


class Record(object):
    _obj = None
    _cache = None

    def __new1__(cls, *args, **kwargs):
        obj = super(Record, cls).__new__(cls, *args)
        if '_obj' not in kwargs:
            obj.__dict__['_obj'] = cls._meta.model(obj)
        obj.__dict__['_cache'] = {}
        return obj

    def __init1__(self, *args, **kwargs):
        if args:
            self.__dict__['_obj'] = args[0]
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __init__(self, **kwargs):
        #super(Record, self).__init__()
        self.__dict__['_cache'] = {}
        for k, v in kwargs.items():
            setattr(self, k, v)

            #if self._meta.pk.attname not in kwargs:
            #    self._cache.update({self._meta.fields_dict[k].attname: v for k, v in kwargs.items()})

    def __setattr1__(self, key, value):
        if key != '_cache':
            if self._cache is not None:
                self._cache[self._meta.fields_dict[key].attname] = value.pk if isinstance(value, Record) else value
        super(Record, self).__setattr__(key, value)

    def __getattr__(self, item):
        if self._obj:
            return getattr(self._obj, item)

    def __getitem__(self, item):
        return self._cache.get(item, self.__dict__.get(item, None))
