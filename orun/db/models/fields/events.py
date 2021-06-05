
class FieldEvent:
    def __init__(self, field, meth):
        self.field = field
        self.meth = meth

    def contribute_to_class(self, cls, name, **kwargs):
        cls._meta.fields_events[self.field.name].append(self)
        setattr(cls, name, self.meth)

    def __call__(self, instance):
        self.meth(instance)
