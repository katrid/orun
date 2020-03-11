from orun.db import models
from orun.utils.translation import gettext_lazy as _

AVAILABLE_PRIORITIES = (
    ('0', 'Low'),
    ('1', 'Medium'),
    ('2', 'High'),
    ('3', 'Very High'),
)


class Lead(models.Model):
    name = models.CharField(128, verbose_name=_('Opportunity'), null=False, db_index=True)
    partner = models.ForeignKey(
        'res.partner', verbose_name='Customer', track_visibility='onchange', track_sequence=1, db_index=True,
        help="Linked partner (optional). Usually created when converting the lead. You can find a partner by its Name, TIN, Email or Internal Reference."
    )
    active = models.BooleanField(verbose_name='Active', default=True, track_visibility=True)
    date_action_last = models.DateTimeField(verbose_name='Last Action', readonly=True)
    email_from = models.EmailField(verbose_name=_('Email'), help="Email address of the contact",
                                   track_visibility='onchange',
                                   track_sequence=4, db_index=True)
    website = models.CharField(verbose_name=_('Website'), db_index=True, help="Website of the contact")
    team = models.ForeignKey(
        'crm.team', verbose_name='Sales Team',
        default=lambda self: self.env['crm.team'].sudo()._get_default_team_id(user_id=self.env.uid),
        db_index=True, track_visibility='onchange',
        help='When sending mails, the default email address is taken from the Sales Team.'
    )
    kanban_state = models.ChoiceField(
        [('grey', 'No next activity planned'), ('red', 'Next activity late'), ('green', 'Next activity is planned')],
        verbose_name='Kanban State', compute='_compute_kanban_state'
    )
    email_cc = models.TextField('Global CC',
                                help="These email addresses will be added to the CC field of all inbound and outbound emails for this record before being sent. Separate multiple email addresses with a comma")
    description = models.TextField('Notes')
    tags = models.ManyToManyField(
        'crm.lead.tag', 'crm_lead_tag_rel', 'lead_id', 'tag_id', verbose_name='Tags',
        help="Classify and analyze your lead/opportunity categories like: Training, Service"
    )
    contact_name = models.CharField(
        verbose_name=_('Contact Name'), track_visibility='onchange', track_sequence=3
    )
    partner_name = models.CharField("Customer Name", track_visibility='onchange', track_sequence=2, db_index=True,
                                    help='The name of the future partner company that will be created while converting the lead into opportunity')
    type = models.ChoiceField([('lead', 'Lead'), ('opportunity', 'Opportunity')], db_index=True, null=False,
                              default=lambda self: 'lead' if self.env['res.users'].has_group(
                                  'crm.group_use_lead') else 'opportunity',
                              help="Type is used to separate Leads and Opportunities")
    priority = models.ChoiceField(
        AVAILABLE_PRIORITIES, verbose_name='Priority', db_index=True,
        default=AVAILABLE_PRIORITIES[0][0]
    )
    date_closed = models.DateTimeField(verbose_name=_('Closed Date'), readonly=True, copy=False)

    stage = models.ForeignKey(
        'crm.stage', verbose_name=_('Stage'), track_visibility='onchange',
        db_index=True, copy=False,
        domain="['|', ('team_id', '=', False), ('team_id', '=', team_id)]",
        group_expand='_read_group_stage_ids', default=lambda x: x._default_stage_id()
    )
    user = models.ForeignKey(
        'res.users', verbose_name='Salesperson', track_visibility='onchange',
        default=lambda self: self.env.user
    )
    referred = models.CharField(verbose_name=_('Referred By'))

    date_open = models.DateTimeField(verbose_name=_('Assignation Date'), readonly=True,
                                     default=models.DateTimeField.now)
    day_open = models.FloatField(compute='_compute_day_open', verbose_name='Days to Assign', store=True)
    day_close = models.FloatField(compute='_compute_day_close', verbose_name='Days to Close', store=True)
    date_last_stage_update = models.DateTimeField(verbose_name='Last Stage Update', db_index=True,
                                                  default=models.DateTimeField.now)
    date_conversion = models.DateTimeField(verbose_name=_('Conversion Date'), readonly=True)

    # Messaging and marketing
    message_bounce = models.IntegerField(
        verbose_name=_('Bounce'),
        help="Counter of the number of bounced emails for this contact", default=0
    )

    # Only used for type opportunity
    probability = models.FloatField(verbose_name=_('Probability'), group_operator="avg", copy=False,
                                    default=lambda x: x._default_probability())
    # planned_revenue = models.Monetary('Expected Revenue', currency_field='company_currency', track_visibility='always')
    # expected_revenue = models.Monetary('Prorated Revenue', currency_field='company_currency', store=True, compute="_compute_expected_revenue")
    date_deadline = models.DateField(
        verbose_name=_('Expected Closing'),
        help="Estimate of the date on which the opportunity will be won."
    )
    color = models.IntegerField(verbose_name=_('Color Index'), default=0)
    partner_address_name = models.CharField('Partner Contact Name', related='partner_id.name', readonly=True)
    partner_address_email = models.CharField('Partner Contact Email', related='partner_id.email', readonly=True)
    partner_address_phone = models.CharField('Partner Contact Phone', related='partner_id.phone', readonly=True)
    partner_is_blacklisted = models.BooleanField(
        verbose_name=_('Partner is blacklisted'), related='partner_id.is_blacklisted', readonly=True
    )
    # company_currency = models.ForeignKey(
    #     verbose_name='Currency', related='company_id.currency_id', readonly=True,
    #     relation="res.currency"
    # )
    user_email = models.CharField(verbose_name=_('User Email'), related='user_id.email', readonly=True)
    user_login = models.CharField(verbose_name=_('User Login'), related='user_id.login', readonly=True)

    # Fields for address, due to separation from crm and res.partner
    street = models.CharField(verbose_name=_('Street'))
    street2 = models.CharField(verbose_name=_('Street2'))
    zip = models.CharField(verbose_name=_('Zip'), change_default=True)
    city = models.CharField(verbose_name=_('City'))
    state = models.ForeignKey('res.country.state', verbose_name='State')
    country = models.ForeignKey('res.country', verbose_name='Country')
    phone = models.CharField(verbose_name=_('Phone'), track_sequence=5)
    mobile = models.CharField(verbose_name=_('Mobile'))
    function = models.CharField(verbose_name=_('Job Position'))
    title = models.ForeignKey('res.partner.title')
    company = models.ForeignKey(
        'res.company', verbose_name='Company', db_index=True, default=lambda self: self.env.user.company_id.id
    )
    meeting_count = models.IntegerField(verbose_name=_('# Meetings'), compute='_compute_meeting_count')
    lost_reason = models.ForeignKey(
        'crm.lost.reason', verbose_name='Lost Reason', db_index=True,
        track_visibility='onchange'
    )

    class Meta:
        name = "crm.lead"
        verbose_name = "Lead/Opportunity"
        ordering = ('-priority', 'activity_date_deadline', '-pk')


class Tag(models.Model):
    name = models.CharField('Name', null=False, translate=True)
    color = models.IntegerField('Color Index')

    class Meta:
        name = "crm.lead.tag"
        verbose_name = "Lead Tag"
        _sql_constraints = [
            ('name_uniq', 'unique (name)', "Tag name already exists !"),
        ]


class LostReason(models.Model):
    name = models.CharField(100, 'Name', null=False, translate=True)
    active = models.BooleanField('Active', default=True)

    class Meta:
        name = "crm.lost.reason"
        verbose_name = 'Opp. Lost Reason'
