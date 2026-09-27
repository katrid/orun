from orun.db import models


class ModuleCategory(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        name = 'content.module.category'


class Module(models.Model):
    name = models.CharField(max_length=255, primary_key=True)
    category = models.ForeignKey(ModuleCategory)
    description = models.TextField()

    class Meta:
        name = 'core.module'
