from orun import apps
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class PartnerCategory(models.Model):
    name = models.CharField(128, _('name'))
    parent = models.ForeignKey('self')
    color = models.IntegerField()

    class Meta:
        name = 'res.partner.category'
        verbose_name = _('Partner Category')
        verbose_name_plural = _('Partner Categories')


class PartnerTitle(models.Model):
    name = models.CharField(128, _('Name'), null=False, translate=True)
    abbreviation = models.CharField(32, _('Abbreviation'), translate=True)

    class Meta:
        name = 'res.partner.title'
        verbose_name = _('Partner Title')
        verbose_name_plural = _('Partner Titles')


class Partner(models.Model):
    name = models.CharField(128, label=_('Name'))
    parent = models.ForeignKey('self')
    title = models.ForeignKey(PartnerTitle, label=_('Title'))
    active = models.BooleanField(default=True, label=_('Active'))
    color = models.IntegerField(label=_('Color'))
    user = models.ForeignKey('auth.user', label=_('User'))
    language = models.ForeignKey('res.language', label=_('Language'))
    email = models.EmailField(label=_('Email'))
    website = models.URLField()
    barcode = models.CharField(label=_('Barcode'))
    is_customer = models.BooleanField(default=False, label=_('Is a Customer'))
    is_supplier = models.BooleanField(default=False, label=_('Is a Supplier'))
    is_employee = models.BooleanField(default=False, label=_('Is a Employee'))
    address = models.CharField(256, label=_('Address'))
    address_2 = models.CharField(256, label=_('Address 2'))
    zip = models.CharField(32, label=_('Zip'))
    country = models.ForeignKey('res.country', label=_('Country'), on_delete=models.SET_NULL)
    state = models.ForeignKey('res.country.state', label=_('State'), on_delete=models.SET_NULL)
    city = models.CharField(64, label=_('City'))
    phone = models.CharField(64, _('Phone'))
    fax = models.CharField(64, 'Fax')
    mobile = models.CharField(64, label=_('Mobile'))
    birthdate = models.CharField(64, label=_('Birthdate'))
    is_company = models.BooleanField(default=False, label=_('Is a Company'))
    contact_type = models.SelectionField(
        (
            ('contact', _('Contact')),
            ('invoice', _('Invoice address')),
            ('shipping', _('Shipping address')),
            ('private', _('Private address')),
            ('other', _('Other address')),
        ), label=_('Address Type'), default='contact'
    )
    company_type = models.CharField(16, label=_('Company Type'), choices=(
        ('individual', 'Individual'),
        ('company', 'Company'),
    ))
    company = models.ForeignKey('res.company', label=_('Company'))
    comments = models.TextField(label=_('Notes'))
    image = models.BinaryField(attachment=True)
    children = models.OneToManyField('self')
    # user password
    site_password = models.PasswordField()

    class Meta:
        name = 'res.partner'
        title_field = 'name'
        verbose_name = _('Partner')
        verbose_name_plural = _('Partners')

    def __str__(self):
        return self.name

    @property
    def is_authenticated(self):
        return True

    def send_mail(self, subject, message, from_=None):
        """
        Sends an email to this User.
        """

        from orun.core.mail import Message
        msg = Message(
            subject,
            recipients=[self.email],
            charset='utf-8',
        )
        if from_:
            msg.sender = from_
        msg.body = message.encode('utf-8')
        msg.html = message.encode('utf-8')
        app.mail.send(msg)

    def set_password(self, password):
        from orun.contrib.auth.hashers import make_password
        self.site_password = make_password(password)

    @classmethod
    def authenticate(cls, username, password):
        from orun.contrib.auth.hashers import check_password
        usr = cls.objects.filter(email=username, active=True).first()
        if usr and check_password(password, usr.site_password):
            return usr
