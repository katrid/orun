from orun.db import models
import mail.models


class MyDocument(mail.models.DocumentApproval):
    STATUS = (
        ('level1', 'Level 1'),
        ('level2', 'Level 2'),
        ('level3', 'Level 2'),
        ('level4', 'Level 5'),
    )
    name = models.CharField()
    status = models.SelectionField(STATUS)

    class Meta:
        name = 'mail_module_test.my.document'


class MyDocumentoDest(models.Model):
    code = models.CharField()
    name = models.CharField()

    class Meta:
        name = 'mail_module_test.my.document.dest'

