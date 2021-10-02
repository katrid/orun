from . import actions
from . import portlets


class AdminSite:
    def __init__(self):
        self.actions = {}
        self.portlets = {}

    def register(self, action_type_or_object, *args):
        if issubclass(action_type_or_object, actions.Action):
            self.actions[action_type_or_object.get_qualname()] = action_type_or_object
            return action_type_or_object
        if issubclass(action_type_or_object, portlets.Portlet):
            self.portlets[action_type_or_object.get_qualname()] = action_type_or_object
            return action_type_or_object

    def update(self):
        """Update admin objects (actions and portlets) information to database"""
        for action in self.actions.values():
            action._update_info()

        for portlet in self.portlets.values():
            portlet._update_info()


# Default admin site instance
admin_site = AdminSite()
