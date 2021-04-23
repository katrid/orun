
class Portlet:
    def __init__(self, model=None, view_type=None, query_id=None, view_id=None, view=None):
        pass

    def render(self, request):
        pass


class Grid(Portlet):
    def __init__(self, model: str=None, where=None):
        self.model = model

    def render(self, request):
        return f'''<bi:grid model="{self.model}" view-type="{self.view_type}"></bi:grid>'''


class WindowActionPortlet(Portlet):
    def __init__(self, model=None, view_type='list'):
        self.model = model
        self.view_type = view_type

    def render(self, request):
        return f'''<bi:grid class="col-md-6" model="{self.model}" view-type="{self.view_type}"></bi:grid>'''
