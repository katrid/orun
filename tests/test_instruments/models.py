from orun.db import models


class InstrumentedModel(models.Model):
    class Meta:
        log_changes = False

    class Instrument:
        x = 1

        def __init__(self, model):
            self.model = model

        @classmethod
        def contribute_to_class(cls, model, name):
            setattr(model, 'Instrument', cls)
            model.__model_instruments__[name] = cls


class ChildInstrumentedModel(InstrumentedModel):
    class Instrument(InstrumentedModel.Instrument):
        x = 2


class NewModel(models.Model):
    class Meta:
        log_changes = False

    def calc(self):
        return self.rules.calc(self)

    class Rules(models.Model.Rules):
        def calc(self, record):
            return 10

    rules: Rules

    class Instrument:
        x = 1

        def __init__(self, model):
            self.model = model

        @classmethod
        def contribute_to_class(cls, model, name):
            setattr(model, 'Instrument', cls)
            model.__model_instruments__[name] = cls


class InstrumentedHelperModel(NewModel, helper=True):
    class Rules(NewModel.Rules):
        def calc(self, record):
            return super().calc(record) * 2

    class Instrument(InstrumentedModel.Instrument):
        x = 3
