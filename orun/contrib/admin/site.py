from . import actions
from . import portlets


class AdminSite:
    def __init__(self):
        self.actions = {}
        self.portlets = {}
        self.menus = {}

    def register(self, action_type_or_object, *args):
        from . import admin
        if isinstance(action_type_or_object, admin.MenuItem):
            # register a menu tree
            self.menus[action_type_or_object.qualname] = action_type_or_object
            return action_type_or_object
        if issubclass(action_type_or_object, actions.Action):
            self.actions[action_type_or_object.get_qualname()] = action_type_or_object
            return action_type_or_object
        if issubclass(action_type_or_object, portlets.Portlet):
            action_type_or_object._admin_registrable = True
            self.portlets[action_type_or_object.get_qualname()] = action_type_or_object
            return action_type_or_object

    def update(self):
        """Update admin objects (actions and portlets) information to database"""
        for action in self.actions.values():
            action._update_info()

        for portlet in self.portlets.values():
            portlet._update_info()

        for menu in self.menus.values():
            menu._update_info()


# Default admin site instance
admin_site = AdminSite()
