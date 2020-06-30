from functools import partial
from types import MethodType, FunctionType


class RecordSet:
    def __init__(self, model, records=None):
        self.__model = model
        self.__records = records

    def __getattr__(self, item):
        attr = getattr(self.__model, item)
        if isinstance(attr, (FunctionType, MethodType)):
            return partial(self.__proxy_attr, attr)
        return attr

    def __proxy_attr(self, meth, *args, **kwargs):
        return meth(self, *args, **kwargs)
