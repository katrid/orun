from orun.db import models


class LogEntry(models.Model):
    """
    Log entries for Admin UI and API operations.
    """
    user = models.ForeignKey('auth_user', null=False, db_index=True)
    action = models.ForeignKey('ui.action')  # optional ui action
    object_id = models.BigIntegerField()
    content_type = models.ForeignKey('content.type', on_delete=models.SET_NULL)
    content_object = models.CharField(200)
    change_message = models.TextField()

    class Meta:
        log_changes = False
        name = 'ir.admin.log'


class UserActionCounter(models.Model):
    """
    Register the number of times that an action is accessed by user on Admin UI
    """
    user = models.ForeignKey('auth.user', null=False, db_index=True)
    action = models.ForeignKey('ui.action', null=False, on_delete=models.DB_CASCADE)
    counter = models.PositiveIntegerField(default=0)

    class Meta:
        log_changes = False
        name = 'ui.admin.user.action.counter'

    @classmethod
    def add_user_action(cls, user, action):
        counter = cls.objects.get_or_create(user=user, action=action)
        counter.counter += 1
        counter.save()
