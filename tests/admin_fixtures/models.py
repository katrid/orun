from orun.db import models


class Author(models.Model):
    name = models.CharField(null=False)


class Book(models.Model):
    name = models.CharField(null=False)
    author = models.ForeignKey(Author, null=False)

