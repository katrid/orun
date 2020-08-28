from orun.db import models
from orun.utils.translation import gettext_lazy as _


class ActivityType(models.Model):
    name = models.CharField(_('Name'), null=False, translate=True)
    summary = models.CharField(_('Summary'), translate=True)
    sequence = models.IntegerField(_('Sequence'), default=10)
    active = models.BooleanField(default=True, verbose_name=_('Active'))
    delay_count = models.IntegerField(
        verbose_name=_('After'), default=0,
        help_text='Number of days/week/month before executing the action. It allows to plan the action deadline.'
    )
    delay_unit = models.SelectionField(
        (
            ('days', 'days'),
            ('weeks', 'weeks'),
            ('months', 'months')
        ), verbose_name="Delay units", help_text="Unit of delay", null=False, default='days'
    )
    delay_from = models.SelectionField(
        (
            ('current_date', 'after validation date'),
            ('previous_activity', 'after previous activity deadline')
        ), verbose_name="Delay Type", help_text="Type of delay", null=False, default='previous_activity'
    )
    icon = models.CharField(verbose_name=_('Icon'), help_text="Font awesome icon e.g. fa-tasks")
    decoration_type = models.SelectionField(
        (
            ('warning', 'Alert'),
            ('danger', 'Error')
        ), verbose_name="Decoration Type",
        help_text="Change the background color of the related activities of this type."
    )
    res_model_id = models.ForeignKey(
        'content.type', 'Model', index=True,
        domain=['&', ('is_mail_thread', '=', True), ('transient', '=', False)],
        help_text='Specify a model if the activity should be specific to a model'
                  ' and not available when managing activities for other models.'
    )
    default_next_type_id = models.ForeignKey(
        'mail.activity.type', verbose_name=_('Default Next Activity'),
        domain="['|', ('res_model_id', '=', False), ('res_model_id', '=', res_model_id)]"
    )
    force_next = models.BooleanField(verbose_name=_("Auto Schedule Next Activity"), default=False)
    next_type = models.ManyToManyField(
        'mail.activity.type', 'mail_activity_rel', 'activity_id', 'recommended_id',
        domain="['|', ('res_model_id', '=', False), ('res_model_id', '=', res_model_id)]",
        verbose_name='Recommended Next Activities')
    previous_type = models.ManyToManyField(
        'mail.activity.type', 'mail_activity_rel', 'recommended_id', 'activity_id',
        domain="['|', ('res_model_id', '=', False), ('res_model_id', '=', res_model_id)]",
        verbose_name='Preceding Activities')
    category = models.ChoiceField(
        (
            ('default', 'Other')
        ), default='default',
        verbose_name='Category',
        help_text='Categories may trigger specific behavior like opening calendar view'
    )
    mail_template = models.ManyToManyField('mail.template', verbose_name='Mails templates')

    # Fields for display purpose only
    initial_res_model_id = models.ForeignKey(
        'content.type', 'Initial model', compute="_compute_initial_res_model_id", store=False,
        help_text='Technical field to keep trace of the model at the beginning of the edition for UX related behaviour'
    )
    model_has_change = models.BooleanField(
        verbose_name="Model has change",
        help_text="Technical field for UX related behaviour", default=False,
        store=False
    )

    class Meta:
        name = 'mail.activity.type'
        verbose_name = 'Activity Type'
        ordering = ('sequence', 'pk')


class Activity(models.Model):
    object_id = models.IntegerField('Related Document ID', index=True, null=False)
    model = models.ForeignKey(
        'content.type', 'Content Type',
        index=True, ondelete=models.CASCADE, null=False)
    model_name = models.CharField(
        'Related Document Model',
        index=True, related='res_model_id.model', store=True, readonly=True)
    object_name = models.CharField(
        'Document Name', compute='_compute_res_name', store=True,
        help_text="Display name of the related document.", readonly=True)
    # activity
    activity_type_id = models.ForeignKey(
        'mail.activity.type', verbose_name=_('Activity'),
    )
    activity_category = models.SelectionField(related='activity_type_id.category', readonly=True)
    activity_decoration = models.SelectionField(related='activity_type_id.decoration_type', readonly=True)
    icon = models.CharField('Icon', related='activity_type_id.icon', readonly=True)
    summary = models.CharField('Summary')
    note = models.HtmlField('Note')
    feedback = models.HtmlField('Feedback')
    date_deadline = models.DateField('Due Date', index=True, null=False)
    automated = models.BooleanField(
        'Automated activity', readonly=True,
        help_text='Indicates this activity has been created automatically and not by any user.')
    # description
    user_id = models.ForeignKey(
        'res.users', 'Assigned to',
        default=lambda self: self.env.user,
        index=True, null=False)
    create_user_id = models.ForeignKey(
        'res.users', 'Creator',
        default=lambda self: self.env.user,
        index=True)
    state = models.SelectionField([
        ('overdue', 'Overdue'),
        ('today', 'Today'),
        ('planned', 'Planned')], 'State',
        compute='_compute_state')
    recommended_activity_type_id = models.ForeignKey('mail.activity.type', verbose_name="Recommended Activity Type")
    previous_activity_type_id = models.ForeignKey('mail.activity.type', verbose_name='Previous Activity Type',
                                                  readonly=True)
    has_recommended_activities = models.BooleanField(
        'Next activities available',
        compute='_compute_has_recommended_activities',
        help_text='Technical field for UX purpose')
    mail_template_ids = models.ManyToManyField(related='activity_type_id.mail_template_ids', readonly=False)
    force_next = models.BooleanField(related='activity_type_id.force_next', readonly=False)

    class Meta:
        title_field = 'summary'
        name = 'mail.activity'
        verbose_name = 'Activity'
        ordering = ('date_deadline',)


class MailActivityMixin(models.Model):
    activity_ids = models.OneToManyField(
        'mail.activity', 'object_id', verbose_name=_('Activities'),
        # auto_join=True,
        groups="base.group_user",
        domain=lambda self: {'model_name': self._meta.name}
    )
    activity_state = models.SelectionField(
        (
            ('overdue', 'Overdue'),
            ('today', 'Today'),
            ('planned', 'Planned')
        ), verbose_name='Activity State',
        compute='_compute_activity_state',
        groups="base.group_user",
        help_text='Status based on activities\nOverdue: Due date is already passed\n'
                  'Today: Activity date is today\nPlanned: Future activities.'
    )
    activity_user_id = models.ForeignKey(
        'res.users', 'Responsible User',
        related='activity_ids.user_id', readonly=False,
        search='_search_activity_user_id',
        groups="base.group_user"
    )
    activity_type_id = models.ForeignKey(
        'mail.activity.type', 'Next Activity Type',
        related='activity_ids.activity_type_id', readonly=False,
        search='_search_activity_type_id',
        groups="base.group_user"
    )
    activity_date_deadline = models.DateField(
        'Next Activity Deadline',
        compute='_compute_activity_date_deadline', search='_search_activity_date_deadline',
        readonly=True, store=False,
        groups="base.group_user"
    )
    activity_summary = models.CharField(
        'Next Activity Summary',
        related='activity_ids.summary', readonly=False,
        search='_search_activity_summary',
        groups="base.group_user",
    )

    class Meta:
        abstract = True
