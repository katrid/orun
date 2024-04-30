from orun.db import models


class Category(models.Model):
    name = models.CharField()
    parent = models.ForeignKey('self')

    class Meta:
        parent_path_field = 'parent_path'


class Partner(models.Model):
    category = models.ForeignKey(Category)
    name = models.CharField()
