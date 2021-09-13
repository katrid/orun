from . import actions


class AdminSite:
    def __init__(self):
        self.actions = {}

    def register(self, action_type_or_object, *args):
        if issubclass(action_type_or_object, actions.Action):
            self.actions[action_type_or_object.__qualname__] = action_type_or_object
            return action_type_or_object

    def update(self):
        """Update actions information on database"""
        for action in self.actions.values():
            action._update_info()


# Default admin site instance
admin_site = AdminSite()
