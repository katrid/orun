from orun.db import models
import mail.models


class ActivityType(mail.models.ActivityType):
    category = models.SelectionField(add_choices=(('meeting', 'Meeting'),))

    class Meta:
        override = True


class Activity(mail.models.Activity):
    calendar_event = models.ForeignKey('calendar.event', verbose_name="Calendar Meeting", ondelete=models.CASCADE)
