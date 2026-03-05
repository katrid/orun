from .base import Operation


class FieldOperation(Operation):
    def __init__(self, model_name: str, field_name: str):
        self.model_name = model_name
        self.field_name = field_name


class AddField(FieldOperation):
    def describe(self):
        return f"Add field '{self.field_name}' to model '{self.model_name}'"


class DropField(FieldOperation):
    def describe(self):
        return f"Drop field '{self.field_name}' from model '{self.model_name}'"


class AlterField(FieldOperation):
    def describe(self):
        return f"Alter field '{self.field_name}' in model '{self.model_name}'"


class RenameField(FieldOperation):
    def __init__(self, model_name: str, old_field_name: str, new_field_name: str):
        super().__init__(model_name, old_field_name)
        self.new_field_name = new_field_name
