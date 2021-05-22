import re


re_element = re.compile(r'^([:\w_-]*)')
re_css = re.compile(r'^(\.[\w_-]+)')
re_attrs = re.compile(r'^\((.*?)\)')
re_attr = re.compile(r'\s*([\.:\w_-]+)\s*=?\s*(".*?")?\s*\,?')
re_rpar = re.compile(r'\)')
re_inlinetext = re.compile(r'^\s(.*)$')
re_textescape = re.compile(r'^\|(.*)$')
re_startspace = re.compile(r'^\s+')


class Node:
    parent: 'Node' = None
    _text: str = None

    def __init__(self, tag):
        self.tag = tag
        self.attrib = {}
        self.children = []

    def append(self, node: 'Node'):
        node.parent = self
        self.children.append(node)

    @property
    def text(self):
        return self._text

    @text.setter
    def text(self, value):
        self.set_text(value)

    def set_text(self, value):
        self._text = value

    def tostring(self):
        html = f'<{self.tag}'
        if self.attrib:
            html += ' ' + ' '.join([f'{k}={v}' if v else k for k, v in self.attrib.items()])
        if self.children:
            html += '>' + ''.join([el.tostring() for el in self.children])
            html += f'</{self.tag}>'
        else:
            html += '/>'
        return html

    def __iter__(self):
        return iter(self.children)


class Element(Node):
    def set_text(self, value):
        super().set_text(value)
        self.children = [TextElement(value)]


class TextElement(Element):
    def __init__(self, text):
        super().__init__('#textelement')
        self._text = text

    def tostring(self):
        return self.text


class Parser:
    tab_size = None
    re_indent = None

    def __init__(self, tab_size=None):
        if tab_size:
            self.tab_size = tab_size
            self.re_indent = re.compile(fr'\s{{{tab_size}}}')

    def parse(self, source: str):
        attributes = {}
        root = parent = node = None
        indent = ilevel = 0
        indent_size = self.tab_size
        instr = False
        for line in source.splitlines():
            css = ''
            if match := re_startspace.match(line):
                i = match.group()
                sz = len(i)
                line = line[sz:]
                if not indent_size:
                    self.re_indent = re.compile(fr'\s{{{sz}}}')
                    indent_size = sz
                    ilevel = 1
                else:
                    if sz % indent_size:
                        raise Exception('Invalid indentation!')
                    ilevel = sz // indent_size
            if not line:
                continue
            if ilevel:
                if instr and ilevel > indent:
                    if node.text is None:
                        node.text = ''
                    node.text += '\n' + line
                    continue
                elif instr:
                    instr = False
                if indent == ilevel:
                    parent = node.parent
                elif ilevel > indent:
                    parent = node
                else:
                    while indent > ilevel:
                        parent = parent.parent
                        indent -= 1
            else:
                parent = None

            # element
            if match := re_element.search(line):
                el = match.group()
                line = line[len(el):]
                node = Element(el)
                if parent:
                    parent.append(node)
                elif not root:
                    root = node
            # css class
            while match := re_css.match(line):
                s = match.group()[1:]
                css += ' ' + s if css else s
                line = line[len(s):]
            if css:
                node.attrib['class'] = css
            # attributes
            if match := re_attrs.match(line):
                attrs = match.group()
                line = line[len(match.group()):]
                for k, v in re_attr.findall(attrs):
                    if v:
                        v = v[1:-1]
                    node.attrib[k] = v or None
            # inline text
            if match := re_inlinetext.match(line):
                # read text
                if node and match.string:
                    node.text = match.string

            if line == '.':
                instr = True

            indent = ilevel

        return root

    @classmethod
    def from_string(cls, xml):
        parser = cls()
        return parser.parse(xml)
