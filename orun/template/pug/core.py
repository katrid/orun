class Environment:
    tags = {}
    default_template = None

    @classmethod
    def register_class(cls, *args):
        for arg in args:
            cls.tags[arg.tag] = arg


class Element:
    tag = None

    def __init__(self, tag=None, parent=None):
        self.tag = tag or self.tag
        self.parent = parent
        self.stream = []
        self.attrs = {}
        self.class_list = []

    def __bool__(self):
        return True

    def __len__(self):
        return len(self.stream)

    def __iter__(self):
        return iter(self.stream)

    def __repr__(self):
        return str(self)

    def __str__(self):
        return '%s%s%s' % self.render()

    def render_head(self, tag=None):
        tag = tag or self.tag
        attrs = ''
        if self.attrs:
            attrs = ' ' + ' '.join(['{}="{}"'.format(k, v[1:-1] if str(v).startswith('"') or str(v).startswith("'") else v) for k, v in self.attrs.items()])
        if self.class_list:
            attrs += ' class="%s"' % ' '.join(self.class_list)
        return f'''<{tag}{attrs}>'''

    def render_stream(self):
        return '\n'.join([str(child) for child in self.stream])

    def render_foot(self, tag=None):
        tag = tag or self.tag
        return f'''</{tag}>'''

    def render(self):
        return self.render_head(), self.render_stream(), self.render_foot()


class Component(Element):
    @property
    def name(self):
        return self.attrs.get('name')
