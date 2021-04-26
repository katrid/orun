import json


class Element:
    def __init__(self, tag, *args, id=None, attrs=None):
        self.id = id
        self.tag = tag
        self.attrs = attrs or {}
        self.children = list(args)

    def __str__(self):
        return self.render()

    def render(self):
        attrs = ''.join([f' {k}="{v}"' for k, v in self.attrs.items()])
        children = '\n'.join([str(arg) for arg in self.children])
        return f'''<{self.tag}{attrs}>{children}</{self.tag}>'''


def h(tag, *args, id=None, attrs=None):
    return Element(tag, *args, id=id, attrs=attrs)


class _Element(Element):
    tag = 'div'

    def __init__(self, *args, **kwargs):
        super().__init__(self.tag, *args, **kwargs)


class DataTable(_Element):
    tag = 'div'

    def __init__(self, *args, attrs=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.children = [
            Div(
                Div(
                    table(*self.children),
                    attrs={'class': 'dashboard-widget table-responsive'},
                ),
                attrs={'class': 'dashboard-container-widget'},
            )
        ]


class Params(_Element):
    tag = 't-params'


class Param(_Element):
    tag = 't-param'
    choices: list = None

    def __init__(self, name=None, type=None, caption=None, choices=None, operation='=', *args, **kwargs):
        super().__init__(*args, **kwargs)
        if name:
            self.attrs['name'] = name
        if caption:
            self.attrs['caption'] = caption
        if isinstance(type, str):
            self.attrs['type'] = type
        elif type:
            self.attrs['type'] = type.__name__
        if choices:
            self.attrs['type'] = 'ChoiceField'
            self.children.append(f'<option></option>')
            for choice in choices:
                self.children.append(f'<option value="{choice}">{choice}</option>')
        self.attrs['operation'] = operation


class Dash(_Element):
    tag = 'dashboard'


class Div(_Element):
    pass


class table(_Element):
    tag = 'table'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.attrs['class'] = 'table table-bordered'


def thead(*args, **kwargs):
    return h('thead', *args, **kwargs)


def tbody(*args, **kwargs):
    return h('tbody', *args, *kwargs)


def tr(*args, **kwargs):
    return h('tr', *args, **kwargs)


def th(*args, **kwargs):
    return h('th', *args, **kwargs)


def td(*args, **kwargs):
    return h('td', *args, **kwargs)


def h1(*args, **kwargs):
    return h('h1', *args, **kwargs)


def i(*args, **kwargs):
    return h('i', *args, **kwargs)


class Plot(_Element):
    tag = 'bi-plot'

    def __init__(self, data, *args, onclick=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.attrs['@plot-click'] = f"rpc('callback', '{onclick}')"
        self.attrs[':data'] = data
