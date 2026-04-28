from orun import api
from orun.db import models
from orun.http import HttpRequest

from .action import action_hit, Action
from .base import AdminModel

__all__ = ["UxCounter"]


# class Custom(models.Model):
#     name = models.CharField(max_length=1024, label="Name")
#     content = models.TextField()
#     compiled = models.BinaryField()
#     user = models.ForeignKey("auth.user")
#     modified = models.BooleanField(default=False)
#
#     class Meta:
#         name = "admin.ux.custom"
#         natural_key = "name"
#         constraints = [models.UniqueConstraint(fields=["name", "user"])]


class UxCounter(models.Model):
    """
    Rank the number of times that user accesses an action on Admin UI
    """

    user = models.ForeignKey("auth.user", null=False, on_delete=models.DB_CASCADE)
    action_id = models.BigIntegerField(null=False, db_index=True)
    counter = models.BigIntegerField(default=0, db_index=True)
    last_access = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        log_changes = False
        name = "admin.ux.counter"

    class Admin(AdminModel.Admin):
        readonly = True

    @classmethod
    def hit(cls, user_id: int, key: int):
        """
        Log a new entry to user action
        """
        counter = cls.objects.only("counter").filter(user_id=user_id, action_id=key).first()
        if counter is None:
            counter = cls.objects.create(user_id=user_id, action_id=key)
        counter.update(counter=counter.counter + 1)

    @api.classmethod
    def get_entries(cls, request: HttpRequest):
        """
        Get the latest actions by user
        """
        entries = cls.objects.filter(user_id=int(request.user_id)).order_by('-last_access')[:10]
        actions = {a[0]: a[1] for a in Action.objects.filter(pk__in=[obj.action_id for obj in entries]).values_list('id', 'name')}
        return {
            "entries": [
                {
                    "last_access": obj.last_access,
                    "description": actions.get(obj.action_id, 'Unknown'),
                }
                for obj in entries
            ]
        }


def _action_hit(sender, request, *args, **kwargs):
    UxCounter.hit(int(request.user_id), sender.pk)

action_hit.connect(_action_hit)
