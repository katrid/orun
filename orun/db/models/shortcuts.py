

def select(*fields):
    model = None
    for f in fields:
        model = f.model
        break
    if model is None:
        raise ValueError('Model is not specified!')


class Join:
    pass
