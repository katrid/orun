from orun import g, api
from orun.apps import apps
from orun.dispatch import Signal
from orun.utils.translation import gettext_lazy as _, gettext
from orun.db import models
from orun.core.exceptions import PermissionDenied

from . import comment


class DocumentApproval(comment.Comments):
    """
    Model for documents with approval levels.
    """
    current_approval_level = models.ForeignKey('mail.approval.level', on_delete=models.SET_NULL, copy=False)

    def can_approve_document_level(self, user, level):
        return True

    def approve_document_level(self, level=None):
        next_approval = self.next_approval_level
        if level is None:
            level = self.next_approval_level
        if 'user' in g and not g.user.is_superuser:
            l = level or self.current_approval_level
            if l.permission == 'user' and l.user_id != g.user_id:
                raise PermissionDenied(gettext('Permission denied'))
        if level is None or self.current_approval_level_id == level.pk:
            next_level = self.current_approval_level.next_level
            if next_level is None:
                cur_level = self.current_approval_level.level
                opts = self._meta.fields[self._meta.status_field].choices
                for i, opt in enumerate(opts):
                    if opt[0] == cur_level:
                        next_level = opts[i+1][0]
                        break
            setattr(self, self._meta.status_field, next_level)
            self.evaluate_auto_approval_level()
        else:
            self.current_approval_level = level
            setattr(self, self._meta.status_field, level.level)

        # send the document_approved signal
        document_approved.send(self, user=g.user, level=level or self.current_approval_level)
        # send the approval_needed signal
        if self.current_approval_level.permission != 'allow' and next_approval:
            approval_needed.send(self, user=g.user, level=self.current_approval_level)

    def get_document_level_value(self):
        return getattr(self, self._meta.status_field)

    def evaluate_auto_approval_level(self):
        # there's no approval level
        next_level = self.next_approval_level
        if self.current_approval_level_id is None:
            if next_level is None:
                return
            self.current_approval_level = next_level
            self.save()
            return False
        elif next_level is None and self.current_approval_level_id is not None:
            status = self.get_document_level_value()
            # it's the last step
            if status != self.current_approval_level.next_level and self.current_approval_level.permission == 'allow':
                setattr(self, self._meta.status_field, self.current_approval_level.next_level)
                self.save()
                document_approved.send(self, user=g.user, level=self.current_approval_level)
            return False
        else:
            level = apps['mail.approval.level'].objects.filter(id=next_level.pk, permission='allow').first()
            if level is not None:
                self.current_approval_level = level
                setattr(self, self._meta.status_field, level.level)
                self.save()
                document_approved.send(self, user=g.user, level=self.current_approval_level)
                return True

    @property
    def next_approval_level(self):
        current_level = self.current_approval_level
        if current_level is None:
            level = self.get_document_level_value()
            objs = apps['mail.approval.level'].objects.filter(
                approval_model__model__name=self._meta.name, approval_model__active=True
            )
            if level:
                obj = objs.filter(level=level).first()
                return obj
            return objs.first()
        else:
            Level = apps['mail.approval.level']
            return Level.objects.filter(
                sequence__gt=self.current_approval_level.sequence,
                approval_model=self.current_approval_level.approval_model,
            ).first()

    class Meta:
        abstract = True
        auto_send_approval = False

    def deserialize(self, instance, data):
        original_level = instance.current_approval_level_id
        super().deserialize(instance, data)
        if not instance.evaluate_auto_approval_level():
            # send approval signal if it has a pending level after auto evaluation detection
            if original_level != instance.current_approval_level_id and instance.current_approval_level.permission != 'allow':
                # force refresh
                instance.refresh()
                if getattr(self._meta, 'auto_send_approval', True):
                    approval_needed.send(instance, user=g.user, level=instance.current_approval_level)

    def get_confirmation_message(self):
        raise NotImplemented

    @api.record
    def send_approval(self):
        assert self.current_approval_level, 'Não há nível de aprovação especificado para o documento'
        approval_needed.send(self, user=g.user, level=self.current_approval_level)


class ApprovalModel(models.Model):
    name = models.CharField(null=False)
    model = models.ForeignKey('ir.model', null=False)
    active = models.BooleanField(default=True)
    levels = models.OneToManyField('mail.approval.level')

    class Meta:
        name = 'mail.approval.model'


class ApprovalLevel(models.Model):
    PERMISSION = (
        ('allow', _('Allowed')),
        ('user', _('User')),
        ('group', _('Group')),
    )
    approval_model = models.ForeignKey(ApprovalModel, null=False)
    sequence = models.IntegerField()
    level = models.CharField()
    next_level = models.CharField()
    permission = models.SelectionField(PERMISSION)
    user = models.ForeignKey('auth.user')
    group = models.ForeignKey('auth.group')
    sql_criteria = models.TextField(label='Custom Criteria')

    class Meta:
        name = 'mail.approval.level'
        ordering = 'sequence'

    def __str__(self):
        return self.level


class ApprovalHistory(models.Model):
    model = models.CharField()
    object_id = models.BigIntegerField(null=False)
    level = models.ForeignKey(ApprovalLevel, null=False)

    class Meta:
        name = 'mail.approval.history'
        log_changes = False


def _document_approved(doc, user, level, **kwargs):
    history = apps['mail.approval.history']
    history.create(model=doc._meta.name, object_id=doc.pk, level_id=level.pk)
    for msg in doc.post_message([doc.pk], gettext('Document has been approved.')):
        send_approved_message.send(doc, msg=msg, user=user, level=level)


def _approval_needed(doc, user, level, **kwargs):
    for msg in doc.post_message([doc.pk], gettext('Do you confirm this document approval?')):
        send_approval_message.send(doc, msg=msg, user=user, level=level)


document_approved = Signal()
approval_needed = Signal()
send_approval_message = Signal()
send_approved_message = Signal()

document_approved.connect(_document_approved)
approval_needed.connect(_approval_needed)
