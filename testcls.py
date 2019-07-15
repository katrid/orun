

class ModelBase(type):
    def __new__(cls, name, bases, attrs):
        super_new = super().__new__
        if not bases:
            return super_new(cls, name, bases, attrs)
        if attrs.get('__app__'):
            return super_new(cls, name, bases, attrs)
        new_cls = super_new(cls, name, (Model,), attrs)
        new_cls.BASES = bases
        return new_cls

    def __build__(cls):
        bases = (cls,) + cls.BASES
        return type(cls.__name__, bases, {'__app__': True})


class Model(metaclass=ModelBase):
    pass


class ModelA(Model):
    pass


class ModelB(ModelA):
    pass


class ModelC(ModelA):
    pass


new_model = ModelB.__build__()
print(new_model.mro())

print(issubclass(new_model, ModelB))
