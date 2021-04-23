
class Registry(dict):
    def register(self, cls, name):
        self[name] = cls
