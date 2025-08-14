from orun.db import models


class Author(models.Model):
    name = models.CharField(max_length=100)
    details = models.JSONField()

    class Meta:
        verbose_name = 'Author'
        verbose_name_plural = 'Authors'


class BookWithRecordField(models.Model):
    title = models.CharField(max_length=200)
    details = models.RecordField({
        'author': models.ForeignKey(Author),
        'isbn': models.CharField(max_length=13),
        'published_date': models.DateField(),
        'summary': models.TextField(),
    })

    class Meta:
        verbose_name = 'Book with Record Field'
        verbose_name_plural = 'Books with Record Field'
