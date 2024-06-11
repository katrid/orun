

class PreparedReport:
    content: str | bytes = None
    content_type: str = None

    def __init__(self, content=None, content_type=None):
        self.content = content
        self.content_type = content_type


class PreparedPage:
    def __init__(self):
        self.objects = []

    def add_object(self, obj):
        self.objects.append(obj)
