from orun.db import models
from orun.utils.translation import gettext_lazy as _


class MailTemplate(models.Model):
    name = models.CharField(verbose_name=_('Name'))
    model = models.ForeignKey(
        'ir.model', verbose_name=_('Applies to'), help_text="The type of document this template can be used with"
    )
    model_name = models.CharField(128,
        verbose_name=_('Related Document Model'), related='model_id.model', index=True, store=True,
        readonly=True
    )
    lang = models.CharField(32,
        verbose_name=_('Language'),
        help_text="Optional translation language (ISO code) to select when sending out an email. "
                  "If not set, the english version will be used. "
                  "This should usually be a placeholder expression "
                  "that provides the appropriate language, e.g. "
                  "${object.partner_id.lang}.",
        placeholder="${object.partner_id.lang}"
    )
    user_signature = models.BooleanField(
        verbose_name=_('Add Signature'),
        help_text="If checked, the user's signature will be appended to the text version of the message"
    )
    subject = models.CharField(
        verbose_name=_('Subject'), translate=True, help_text="Subject (placeholders may be used here)"
    )
    email_from = models.EmailField(
        verbose_name=_('From'),
        help_text="Sender address (placeholders may be used here). If not set, the default "
                  "value will be the author's email alias if configured, or email address."
    )
    use_default_to = models.BooleanField(
        verbose_name=_('Default recipients'),
        help_text="Default recipients of the record:\n"
                  "- partner (using id on a partner or the partner_id field) OR\n"
                  "- email (using email_from or email field)")
    email_to = models.CharField(
        verbose_name=_('To (Emails)'),
        help_text="Comma-separated recipient addresses (placeholders may be used here)"
    )
    partner_to = models.CharField(
        verbose_name=_('To (Partners)'),
        help_text="Comma-separated ids of recipient partners (placeholders may be used here)"
    )
    email_cc = models.CharField('Cc', help_text="Carbon copy recipients (placeholders may be used here)")
    reply_to = models.CharField('Reply-To', help_text="Preferred response address (placeholders may be used here)")
    mail_server = models.ForeignKey(
        'ir.mail.server', verbose_name=_('Outgoing Mail Server'), readonly=False,
        help_text="Optional preferred server for outgoing mails. If not set, the highest "
                  "priority one will be used."
    )
    body_html = models.HtmlField(verbose_name=_('Body'), translate=True, sanitize=False)
    report_name = models.CharField(
        'Report Filename', translate=True,
        help_text="Name to use for the generated report file (may contain placeholders)\n"
                  "The extension can be omitted and will then come from the report type."
    )
    report_template = models.ForeignKey('ir.actions.report', 'Optional report to print and attach')
    ref_ir_act_window = models.ForeignKey('ir.actions.act_window', 'Sidebar action', readonly=True, copy=False,
                                          help_text="Sidebar action to make this template available on records "
                                                    "of the related document model")
    attachment_ids = models.ManyToManyField(
        'ir.attachment', 'email_template_attachment_rel', 'email_template_id',
        'attachment_id', 'Attachments',
        help_text="You may attach files to this template, to be added to all "
                  "emails created from this template"
    )
    auto_delete = models.BooleanField(
        verbose_name=_('Auto Delete'), default=True,
        help_text="Permanently delete this email after sending it, to save space"
    )

    # Fake fields used to implement the placeholder assistant
    model_object_field = models.ForeignKey(
        'ir.model.fields', verbose_name="Field",
        help_text="Select target field from the related document model.\n"
                  "If it is a relationship field you will be able to select"
                  "a target field at the destination of the relationship."
    )
    sub_object = models.ForeignKey(
        'ir.model', verbose_name=_('Sub-model'), readonly=True,
        help_text="When a relationship field is selected as first field, "
                  "this field shows the document model the relationship goes to."
    )
    sub_object_field = models.ForeignKey(
        'ir.model.fields', verbose_name=_('Sub-field'),
        help_text="When a relationship field is selected as first field, "
                  "this field lets you select the target field within the "
                  "destination document model (sub-model)."
    )
    null_value = models.CharField(
        verbose_name=_('Default Value'), help_text="Optional value to use if the target field is empty"
    )
    copy_value = models.CharField(
        verbose_name=_('Placeholder Expression'),
        help_text="Final placeholder expression, to be copy-pasted in the desired template field."
    )
    scheduled_date = models.CharField(
        verbose_name=_('Scheduled Date'),
        help_text="If set, the queue manager will send the email after the date. If not set, the email will be send as soon as possible. Jinja2 placeholders may be used."
    )

    class Meta:
        name = "mail.template"
        verbose_name = _('Email Template')
        verbose_name_plural = _('Email Templates')
        ordering = ('name',)
