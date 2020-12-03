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
        name = 'ir.admin.log'


class ObjectEntry(models.Model):
    """
    Register entries to the quick search on Admin UI menu
    """
    object_id = models.BigIntegerField(null=False)
    content_type = models.ForeignKey('content.type', null=False)
    content_object = models.CharField(200)

    class Meta:
        log_changes = False
        name = 'ui.admin.entry'

    @classmethod
    def log(cls, obj: models.Model):
        """
        Logs a new entry to the quick search menu
        :param obj:
        :return:
        """
        ct = cls.env['content.type'].get_for_model(obj)
        entry = cls.objects.get_or_create(object_id=obj.pk, content_type=ct)
        entry.content_object = str(obj)
        entry.save()


class UserActionCounter(models.Model):
    """
    Ranking the number of times that an action is accessed by an user on Admin UI
    """
    user = models.ForeignKey('auth.user', null=False, db_index=True)
    action = models.ForeignKey('ui.action', null=False, on_delete=models.DB_CASCADE)
    counter = models.PositiveIntegerField(default=0)

    class Meta:
        log_changes = False
        name = 'ui.admin.user.action.counter'

    @classmethod
    def log(cls, user, action):
        """
        Log a new entry to user latest action access
        :param user:
        :param action:
        :return:
        """
        counter = cls.objects.get_or_create(user=user, action=action)
        counter.counter += 1
        counter.save()
