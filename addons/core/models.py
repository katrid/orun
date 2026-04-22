from orun.db import models


class CoreSettings(models.Model):
    key = models.CharField(512, db_index=True, unique=True, null=False)
    value = models.JSONField()

    class Meta:
        name = 'core.settings'
        exposed = False


class UserProfile(models.Model):
    user = models.OneToOneField('auth.user', null=False, on_delete=models.CASCADE)
    key = models.CharField(512, null=False)
    value = models.JSONField()

    class Meta:
        name= 'auth.user.profile'
        constraints = [
            models.UniqueConstraint(['user', 'key'], name='auth_user_profile')
        ]
        exposed = False

# class AbstractUser(models.Model):
#     class Meta:
#         abstract = True
#
#
# class Group(models.Model):
#     name = models.CharField(512, unique=True)
#     description = models.TextField()
#
#     class Meta:
#         name = 'auth.group'
#
#
# class User(AbstractUser):
#     class Meta:
#         name = 'auth.user'
