from orun.apps import apps


def From(model: str):
    return apps[model].objects
