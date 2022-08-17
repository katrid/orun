from typing import Type, Optional


class Column:
    def __init__(
            self, *args, name=None, v_align=None, h_align=None, label: str | None = None,
            total: str | None = None, visible=True, cols: int = None, width: int = None,
    ):
        self.name: str = name
        self.label = label
        self.v_align = v_align
        self.h_align = h_align
        self.visible = visible
        self.total = total
        self.cols = cols
        self.width = width

    @classmethod
    def from_node(cls, node):
        print(node.attrib)
        col = cls(name=node.attrib['name'], label=node.attrib.get('caption'), total=node.attrib.get('total'))
        return col

    def __set_name__(self, owner, name):
        if self.name is None:
            self.name = name

        if self.label is None:
            self.label = self.name.capitalize()

    def get_metadata(self):
        return {
            'name': self.name,
            'label': self.label,
            'visible': self.visible,
            'total': self.total,
        }


class Grid:
    def __init__(self, columns=None):
        if columns is None:
            columns = []
        self.columns = columns

    @classmethod
    def from_class(cls, source: Type):
        res = cls(columns=[getattr(source, k) for k in source.__dict__.keys() if not k.startswith('_')])
        return res

    @classmethod
    def from_node(cls, node):
        res = cls(columns=[Column.from_node(col) for col in node if col.tag == 'column'])
        return res

    def get_metadata(self):
        return {
            'columns': [col.get_metadata() for col in self.columns]
        }
