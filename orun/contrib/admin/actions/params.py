from typing import Type, Dict, Optional

from orun.db.models.fields import datatype_map
from orun.db.models.base import ModelBase


class Params:
    def __init__(self):
        self.params: Dict[str, Param] = {}

    @classmethod
    def from_class(cls, source: Type):
        params = source.__dict__.keys()
        inst = cls()
        for k in params:
            if k.startswith('_'):
                continue
            inst.params[k] = getattr(source, k)
        return inst

    @classmethod
    def from_node(cls, node):
        res = cls()
        res.params = {child.attrib['name']: Param.from_node(child) for child in node}
        return res

    def get_params_info(self):
        return {
            k: v.get_param_info()
            for k, v in self.params.items()
        }


class Param:
    def __init__(self, name=None, data_type=None, required=False, label: Optional[str]=None, model=None, operation=None, options: dict=None):
        self.name = name
        self.data_type = data_type
        self.required = required
        self.label: Optional[str] = label
        self.model = model
        self.operation = operation
        self.options = options

    @classmethod
    def from_node(cls, node):
        res = cls(
            node.attrib['name'], data_type=node.attrib.get('type'), label=node.attrib.get('caption'),
            model=node.attrib.get('model-choices'), operation=node.attrib.get('operation'),
        )
        for opt in node:
            if opt.tag == 'option':
                res.options[opt.attrib.get('value')] = opt.text
        return res

    def __set_name__(self, owner, name):
        if self.name is None:
            self.name = name
        if self.label is None:
            self.label = self.name.capitalize()

    def get_param_info(self):
        dt = datatype_map.get(self.data_type, self.data_type)
        if dt is None:
            # check if data type is a model name
            if self.model:
                dt = 'ModelChoices'
            else:
                dt = 'StringField'
        return {
            'name': self.name,
            'type': dt,
            'required': self.required,
            'label': self.label,
            'modelChoices': self.model,
            'operation': self.operation,
            'options': self.options,
        }
