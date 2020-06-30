from orun.db import models
from orun.utils.translation import gettext_lazy as _


class CashboxLine(models.Model):
    coin_value = models.FloatField(verbose_name=_('Coin/Bill Value'), null=False)
    number = models.IntegerField(verbose_name=_('#Coins/Bills'))
    # subtotal = models.FloatField()
    cashbox = models.ForeignKey('account.bank.statement.cashbox', verbose_name=_('Cashbox'))
    currency = models.ForeignKey('res.currency', proxy='cashbox.currency')

    class Meta:
        name = 'account.cashbox.line'


class BankStatementCashWizard(models.Model):
    cashbox_lines = models.OneToManyField('account.cashbox.line', verbose_name=_('Cashbox Lines'))

    class Meta:
        name = 'account.bank.statement.cashbox'


class BankStatement(models.Model):
    name = models.CharField(verbose_name='Reference', states={'open': {'readonly': False}}, copy=False, readonly=True)
    reference = models.CharField(verbose_name='External Reference', states={'confirm': {'readonly': False}}, copy=False, readonly=True)
    date = models.DateField(null=False, states={'confirm': {'readonly': True}})
    date_done = models.DateTimeField(verbose_name=_('Closed On'))
    balance_start = models.MonetaryField(verbose_name=_('Starting Balance'), states={'confirm': {'readonly': True}})
    balance_end_real = models.MonetaryField('Ending Balance', states={'confirm': [('readonly', True)]})
    accounting_date = models.DateField(verbose_name="Accounting Date", help_text="If set, the accounting entries created during the bank statement reconciliation process will be created at this date.\n"
                                                                 "This is useful if the accounting period in which the entries should normally be booked is already closed.",
                                  states={'open': [('readonly', False)]}, readonly=True)
    state = models.ChoiceField([('open', 'New'), ('confirm', 'Validated')], verbose_name='Status', null=False, readonly=True, copy=False, default='open')
    currency = models.ForeignKey('res.currency', compute='_compute_currency', verbose_name="Currency")
    journal = models.ForeignKey('account.journal', verbose_name='Journal', null=False, states={'confirm': [('readonly', True)]}, default=_default_journal)
    journal_type = models.ChoiceField(proxy='journal.type', help_text="Technical field used for usability purposes")
    company = models.ForeignKey(
        'res.company', proxy='journal.company', verbose_name='Company', store=True, readonly=True,
        default=lambda self: self.env.company
    )

    total_entry_encoding = models.MonetaryField('Transactions Subtotal', compute='_end_balance', store=True, help_text="Total of transaction lines.")
    balance_end = models.MonetaryField('Computed Balance', compute='_end_balance', store=True, help_text='Balance as calculated based on Opening Balance and transaction lines')
    difference = models.MonetaryField(compute='_end_balance', store=True, help_text="Difference between the computed ending balance and the specified ending balance.")

    lines = models.OneToManyField('account.bank.statement.line', 'statement', verbose_name='Statement lines', states={'confirm': [('readonly', True)]}, copy=True)
    move_lines = models.OneToManyField('account.move.line', 'statement', verbose_name='Entry lines', states={'confirm': [('readonly', True)]})
    move_line_count = models.IntegerField(compute="_get_move_line_count")

    all_lines_reconciled = models.BooleanField(compute='_check_lines_reconciled')
    user = models.ForeignKey('res.users', verbose_name='Responsible', required=False, default=lambda self: self.env.user)
    cashbox_start = models.ForeignKey('account.bank.statement.cashbox', verbose_name="Starting Cashbox")
    cashbox_end = models.ForeignKey('account.bank.statement.cashbox', verbose_name="Ending Cashbox")
    is_difference_zero = models.BooleanField(compute='_is_difference_zero', verbose_name='Is zero', help_text="Check if difference is zero.")

    class Meta:
        name = 'account.bank.statement'
        verbose_name = _('Bank Statement')


class AccountBankStatementLine(models.Model):

    name = models.CharField(verbose_name='Label', null=False)
    date = models.DateField(null=False, default=lambda self: self._context.get('date', models.DateField.context_today(self)))
    amount = models.MonetaryField(currency_field='journal_currency')
    journal_currency = models.ForeignKey(
        'res.currency', verbose_name="Journal's Currency", proxy='statement.currency',
        help_text='Utility field to express amount currency', readonly=True
    )
    partner = models.ForeignKey('res.partner', verbose_name='Partner')
    account_number = models.CharField(verbose_name='Bank Account Number', help_text="Technical field used to store the bank account number before its creation, upon the line's processing")
    bank_account = models.ForeignKey('res.partner.bank', verbose_name='Bank Account', help_text="Bank account that was used in this transaction.")
    account = models.ForeignKey('account.account', verbose_name='Counterpart Account', domain=[('deprecated', '=', False)],
                                 help_text="This technical field can be used at the statement line creation/import time in order to avoid the reconciliation"
                                      " process on it later on. The statement line will simply create a counterpart on this account")
    statement = models.ForeignKey('account.bank.statement', verbose_name='Statement', index=True, null=False, on_delete=models.CASCADE)
    journal = models.ForeignKey('account.journal', proxy='statement.journal', verbose_name='Journal', store=True, readonly=True)
    partner_name = models.CharField(help_text="This field is used to record the third party name when importing bank statement in electronic format,"
                                    " when the partner doesn't exist yet in the database (or cannot be found).")
    ref = models.CharField(verbose_name='Reference')
    note = models.TextField(verbose_name='Notes')
    transaction_type = models.CharField(verbose_name='Transaction Type')
    sequence = models.IntegerField(index=True, help_text="Gives the sequence order when displaying a list of bank statement lines.", default=1)
    company = models.ForeignKey('res.company', proxy='statement.company', verbose_name='Company', store=True, readonly=True)
    journal_entrys = models.OneToManyField('account.move.line', 'statement_line', 'Journal Items', copy=False, readonly=True)
    amount_currency = models.MonetaryField(help_text="The amount expressed in an optional other currency if it is a multi-currency entry.")
    currency = models.ForeignKey('res.currency', verbose_name='Currency', help_text="The optional other currency if it is a multi-currency entry.")
    state = models.ChoiceField(proxy='statement.state', verbose_name='Status', readonly=True)
    move_name = models.CharField(
        verbose_name='Journal Entry Name', readonly=True,
        default=False, copy=False,
        help_text="Technical field holding the number given to the journal entry, automatically set when the statement line is reconciled then stored to set the same number again if the line is cancelled, set to draft and re-processed again."
    )
    
    class Meta:
        name = 'account.bank.statement.line'
        description = _('Bank Statement Line')
        ordering = ('-statement_id', 'date', 'sequence', '-id')
