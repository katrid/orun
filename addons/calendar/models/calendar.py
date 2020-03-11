from orun.db import models
from orun.utils.translation import gettext_lazy as _
from base.models import get_current_user
import mail.models


class Contacts(models.Model):
    user = models.ForeignKey('auth.user', null=False, default=get_current_user)
    partner = models.ForeignKey('res.partner', verbose_name=_('Partner'))
    active = models.BooleanField(default=True, verbose_name=_('Active'))

    class Meta:
        name = 'calendar.contacts'


class Attendee(models.Model):
    """Calendar Attendee Information"""
    STATUS = (
        ('action', _('Needs Action')),
        ('uncertain', _('Uncertain')),
        ('declined', _('Declined')),
        ('accepted', _('Accepted')),
    )

    status = models.ChoiceField(
        STATUS, readonly=True, default='needs-action',
        help_text="Status of the attendee's participation"
    )
    partner = models.ForeignKey('res.partner', 'Contact', readonly=True)
    email = models.EmailField(verbose_name=_('Email'), help_text="Email of Invited Person")
    availability = models.ChoiceField(
        (('free', _('Free')), ('busy', _('Busy'))), verbose_name=_('Free/Busy'), readonly=True
    )
    access_token = models.CharField(64, 'Invitation Token')
    event = models.ForeignKey('calendar.event', _('Meeting linked'), ondelete=models.CASCADE)

    class Meta:
        name = 'calendar.attendee'
        verbose_name = 'Calendar Attendee Information'
        verbose_name_plural = 'Calendar Attendee Informations'


class AlarmManager(models.Model):
    class Meta:
        abstract = True
        name = 'calendar.alarm_manager'
        verbose_name = 'Event Alarm Manager'
        verbose_name_plural = 'Event Alarm Managers'


class Alarm(models.Model):
    name = models.ChoiceField(verbose_name=_('Name'), translate=True, null=False)
    alarm_type = models.ChoiceField(
        (
            ('notification', 'Notification'), ('email', 'Email')
        ), verbose_name=_('Type'), null=False, default='email'
    )
    duration = models.IntegerField(verbose_name=_('Remind Before'), null=False, default=1)
    interval_unit = models.ChoiceField(
        (
            ('minutes', 'Minute(s)'),
            ('hours', 'Hour(s)'),
            ('days', 'Day(s)')
        ), 'Interval Unit', null=False, default='hours'
    )
    duration_minutes = models.IntegerField(
        verbose_name=_('Duration in minutes'), compute='_compute_duration_minutes', store=True,
        help_text="Duration in minutes"
    )

    class Meta:
        name = 'calendar.alarm'
        verbose_name = 'Event Alarm'


class EventType(models.Model):
    name = models.CharField(verbose_name=_('Name'), null=False)

    class Meta:
        name = 'calendar.event.type'
        verbose_name = 'Event Meeting Type'


class Event(mail.models.Comments):
    name = models.CharField(verbose_name=_('Meeting Subject'), null=True, widget_attrs={'done': [('readonly', True)]})
    status = models.ChoiceField(
        (('draft', _('Unconfirmed')), ('open', _('Confirmed'))), readonly=True, default='draft'
    )

    # is_attendee = models.BooleanField('Attendee', compute='_compute_attendee')
    # attendee_status = models.ChoiceField(Attendee.STATE_SELECTION, verbose_name='Attendee Status', compute='_compute_attendee')
    # display_time = models.CharField('Event Time', compute='_compute_display_time')
    # display_start = models.CharField('Date', compute='_compute_display_start', store=True)
    start = models.DateTimeField(
        verbose_name=_('Start'), null=False,
        help_text="Start date of an event, without time for full days events"
    )
    stop = models.DateTimeField(
        verbose_name=_('Stop'), null=False,
        help_text="Stop date of an event, without time for full days events"
    )

    all_day = models.BooleanField(verbose_name=_('All Day'), states={'done': [('readonly', True)]}, default=False)
    start_date = models.DateField('Start Date', compute='_compute_dates', inverse='_inverse_dates', store=True,
                                  states={'done': [('readonly', True)]}, track_visibility='onchange')
    start_datetime = models.DateTimeField(
        verbose_name=_('Start DateTime'), compute='_compute_dates', inverse='_inverse_dates',
        store=True, states={'done': {'readonly': True}},
        track_visibility='onchange'
    )
    end_date = models.DateField(
        verbose_name=_('End Date'), compute='_compute_dates', inverse='_inverse_dates', store=True,
        states={'done': [('readonly', True)]}, track_visibility='onchange'
    )
    end_datetime = models.DateTimeField(
        verbose_name=_('End Datetime'), compute='_compute_dates', inverse='_inverse_dates', store=True,
        states={'done': [('readonly', True)]},
        track_visibility='onchange'
    )
    duration = models.FloatField(verbose_name=_('Duration'), states={'done': [('readonly', True)]})
    description = models.TextField(verbose_name=_('Description'), states={'done': [('readonly', True)]})
    privacy = models.ChoiceField(
        [('public', 'Everyone'), ('private', 'Only me'), ('confidential', 'Only internal users')],
        verbose_name=_('Privacy'),
        default='public', states={'done': [('readonly', True)]},
    )
    location = models.CharField(
        'Location', states={'done': [('readonly', True)]}, track_visibility='onchange',
        help_text="Location of Event"
    )
    show_as = models.ChoiceField(
        (('free', _('Free')), ('busy', _('Busy'))), verbose_name=_('Show Time as'),
        states={'done': [('readonly', True)]}, default='busy'
    )

    # linked document
    object_id = models.BigIntegerField('Object ID')
    model = models.ForeignKey('ir.model', verbose_name=_('Document Model'), ondelete=models.CASCADE)
    model_name = models.CharField('Document Model Name', related='model.name', readonly=True, store=True)
    activities = models.OneToManyField('mail.activity', 'calendar_event_id', verbose_name='Activities')

    # redifine message_ids to remove autojoin to avoid search to crash in get_recurrent_ids
    # message_ids = models.OneToManyField()

    recurrent_rule = models.CharField(
        verbose_name=_('Recurrent Rule'), compute='_compute_recurrent_rule', inverse='_inverse_recurrent_rule',
        store=True
    )
    recurrent_rule_type = models.ChoiceField(
        (
            ('daily', _('Day(s)')),
            ('weekly', _('Week(s)')),
            ('monthly', _('Month(s)')),
            ('yearly', _('Year(s)')),
        ), verbose_name=_('Recurrence'), states={'done': [('readonly', True)]},
        help_text="Let the event automatically repeat at that interval"
    )
    recurrency = models.BooleanField('Recurrent', help_text="Recurrent Meeting")
    recurrent_id = models.BigIntegerField('Recurrent ID')
    recurrent_id_date = models.DateTimeField('Recurrent ID date')
    end_type = models.ChoiceField(
        (
            ('count', 'Number of repetitions'),
            ('end_date', 'End date')
        ), verbose_name=_('Recurrence Termination'), default='count'
    )
    interval = models.IntegerField(
        verbose_name='Repeat Every', default=1,
        help_text="Repeat every (Days/Week/Month/Year)"
    )
    count = models.IntegerField(verbose_name='Repeat', help_text="Repeat x times", default=1)
    mo = models.BooleanField(verbose_name=_('Mon'))
    tu = models.BooleanField(verbose_name=_('Tue'))
    we = models.BooleanField(verbose_name=_('Wed'))
    th = models.BooleanField(verbose_name=_('Thu'))
    fr = models.BooleanField(verbose_name=_('Fri'))
    sa = models.BooleanField(verbose_name=_('Sat'))
    su = models.BooleanField(verbose_name=_('Sun'))
    month_by = models.ChoiceField([
        ('date', 'Date of month'),
        ('day', 'Day of month')
    ], verbose_name=_('Option'), default='date')
    day = models.IntegerField('Date of month', default=1)
    week_list = models.ChoiceField(
        (
            ('MO', 'Monday'),
            ('TU', 'Tuesday'),
            ('WE', 'Wednesday'),
            ('TH', 'Thursday'),
            ('FR', 'Friday'),
            ('SA', 'Saturday'),
            ('SU', 'Sunday')
        ), verbose_name=_('Weekday')
    )
    by_day = models.ChoiceField(
        (
            ('1', _('First')),
            ('2', _('Second')),
            ('3', _('Third')),
            ('4', _('Fourth')),
            ('5', _('Fifth')),
            ('-1', _('Last')),
        ), verbose_name=_('By day')
    )
    final_date = models.DateField('Repeat Until')
    user_id = models.ForeignKey('res.users', 'Owner', states={'done': [('readonly', True)]},
                                default=lambda self: self.env.user)
    partner_id = models.ForeignKey(
        'res.partner', verbose_name='Responsible', related='user_id.partner_id', readonly=True
    )
    active = models.BooleanField(
        verbose_name=_('Active'), default=True,
        help_text="If the active field is set to false, it will allow you to hide the event alarm information without removing it."
    )
    event_types = models.ManyToManyField('calendar.event.type', verbose_name=_('Tags'))
    attendee = models.OneToManyField(
        'calendar.attendee', 'event', verbose_name=_('Participant'), ondelete=models.CASCADE
    )
    partners = models.OneToManyField(
        'res.partner', 'calendar_event_res_partner_rel', verbose_name='Attendees',
        states={'done': [('readonly', True)]}, default=_default_partners
    )
    alarms = models.ManyToManyField(
        'calendar.alarm', 'calendar_alarm_calendar_event_rel', verbose_name='Reminders',
        ondelete="restrict", copy=False
    )
    is_highlighted = models.BooleanField(compute='_compute_is_highlighted', verbose_name='Is the Event Highlighted')

    class Meta:
        name = 'calendar.event'
        verbose_name = "Event"
