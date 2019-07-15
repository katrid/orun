

def make_model_tuple(model):
    if not isinstance(model, str):
        return model.Meta.name
    return model
