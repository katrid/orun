from orun.utils.xml import etree


class Field:
    def __init__(self, node, model):
        self._node = node
        self.model = model
        self.name = node.attrib.get('name')
        self.total = node.attrib.get('total')
        self.body = node.attrib.get('body')
        self.header = node.attrib.get('header')
        self.footer = node.attrib.get('footer')
        if self.name:
            self.field = model._meta.fields[self.name]
        else:
            self.field = None

    @property
    def label(self):
        if 'label' in self._node.attrib:
            return self._node.attrib['label']
        if self.field:
            return self.field.label
        return self.name


class Repeater:
    def __init__(self, element):
        self.set_element(element)

    def set_element(self, element):
        self._element = element
        self.data_source = element.attrib['data-source']

    def process(self, context):
        output = ''
        ds = context[self.data_source]
        for row in ds:
            pass


def read_fields(model, xml):
    xml = etree.fromstring(xml)
    for child in xml:
        if child.tag == 'field':
            yield Field(child, model)



