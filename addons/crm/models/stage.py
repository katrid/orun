from orun.db import models
from orun import api
from orun.utils.translation import gettext_lazy as _


class Stage(models.Model):
    """ Model for case stages. This models the main stages of a document
        management flow. Main CRM objects (leads, opportunities, project
        issues, ...) will now use only stages, instead of state and stages.
        Stages are for example used to display the kanban view of records.
    """
    name = models.CharField(
        128, verbose_name=_('Stage Name'), null=False, translate=True
    )
    sequence = models.IntegerField(
        verbose_name=_('Sequence'), default=1, help_text="Used to order stages. Lower is better."
    )
    probability = models.FloatField(
        verbose_name=_('Probability (%)'), null=False, default=10.0,
        help_text="This percentage depicts the default/average probability of the Case for this stage to be a success")
    on_change = models.BooleanField(
        verbose_name=_('Change Probability Automatically'),
        help_text="Setting this stage will change the probability automatically on the opportunity.")
    requirements = models.TextField(
        verbose_name=_('Requirements'),
        help_text="Enter here the internal requirements for this stage (ex: Offer sent to customer). It will appear as a tooltip over the stage's name."
    )
    team_id = models.ForeignKey(
        'crm.team', verbose_name='Sales Team', ondelete=models.CASCADE,
        help_text='Specific team that uses this stage. Other teams will not be able to see or use this stage.'
    )
    legend_priority = models.TextField(
        verbose_name=_('Priority Management Explanation'), translate=True,
        help_text='Explanation text to help users using the star and priority mechanism on stages or issues that are in this stage.'
    )
    fold = models.BooleanField(
        verbose_name=_('Folded in Pipeline'),
        help_text='This stage is folded in the kanban view when there are no records in that stage to display.'
    )

    # This field for interface only
    team_count = models.IntegerField('team_count', compute='_compute_team_count')

    @api.record
    def default_get(self, fields):
        """ Hack :  when going from the pipeline, creating a stage with a sales team in
            context should not create a stage for the current Sales Team only
        """
        ctx = dict(self.env.context)
        if ctx.get('default_team_id') and not ctx.get('crm_team_mono'):
            ctx.pop('default_team_id')
        return super(Stage, self.with_context(ctx)).default_get(fields)

    @api.records
    def _compute_team_count(self):
        for stage in self:
            stage.team_count = self.env['crm.team'].search_count([])

    class Meta:
        name = "crm.stage"
        verbose_name = "CRM Stages"
        ordering = ('sequence', 'name', 'id')
