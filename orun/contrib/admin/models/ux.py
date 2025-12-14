from orun.db import models


class Custom(models.Model):
    name = models.CharField(max_length=1024, label='Name')
    content = models.TextField()
    compiled = models.BinaryField()
    user = models.ForeignKey('auth.user')
    modified = models.BooleanField(default=False)

    class Meta:
        name = 'admin.ux.custom'
        natural_key = 'name'
        constraints = [
            models.UniqueConstraint(fields=['name', 'user']),
        ]

    def before_update(self, old, values):
        super().before_update(old, values)
        values['modified'] = True
