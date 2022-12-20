from orun.db import models


class LogEntry(models.Model):
    """
    Log entries on the internal database logging
    """
    user = models.ForeignKey('auth_user', null=False, db_index=True)
    action = models.ForeignKey('ui.action')  # optional ui action
    object_id = models.BigIntegerField()
    content_type = models.ForeignKey('content.type', on_delete=models.SET_NULL)
    content_object = models.CharField(200)
    change_message = models.TextField()

    class Meta:
        log_changes = False
        name = 'ui.admin.log'


class UserMenuCounter(models.Model):
    """
    Rank the number of times that an action is accessed by user on Admin UI
    """
    user = models.ForeignKey('auth.user', null=False, db_index=True, on_delete=models.DB_CASCADE)
    menu = models.ForeignKey('ui.menu', null=False, on_delete=models.DB_CASCADE)
    counter = models.PositiveIntegerField(default=0)

    class Meta:
        log_changes = False
        name = 'ui.admin.user.menu.counter'

    @classmethod
    def hit(cls, user, action):
        """
        Log a new entry to user to the action
        :param user:
        :param action:
        :return:
        """
        counter = cls.objects.get_or_create(user=user, action=action)
        counter.update(counter=counter.counter + 1)
