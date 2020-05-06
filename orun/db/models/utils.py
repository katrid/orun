def make_model_name(model) -> str:
    """
    Take a model or a string of the form "service.name" and return a
    corresponding "service.name" string.
    """
    try:
        if not isinstance(model, str):
            return model.Meta.name
        assert '.' in model
    except (ValueError, AssertionError):
        raise ValueError(
            "Invalid model reference '%s'. String model references "
            "must be of the form 'schema.ModelName'." % model
        )
    return model
