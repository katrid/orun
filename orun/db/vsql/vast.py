

class VNode:
    pass


class FunctionDef(VNode):
    def __init__(self, name, args, body, **kwargs):
        pass


class TriggerDef(FunctionDef):
    pass


class ClassDef(VNode):
    def __init__(self, name, body, **kwargs):
        self.name = name
        self.body = body


class Module(VNode):
    def __init__(self, body, **kwargs):
        self.body = body


class Expr(VNode):
    def __init__(self, value, **kwargs):
        pass


class Call(VNode):
    def __init__(self, func, **kwargs):
        pass

    def as_sql(self):
        pass


class Attribute(VNode):
    pass


def trigger():
    pass
