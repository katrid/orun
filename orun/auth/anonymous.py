

class AnonymousUser(object):
    @property
    def is_authenticated(self):
        return False

    @property
    def is_superuser(self):
        return False
