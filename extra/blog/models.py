from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Template(models.Model):
    name = models.CharField(128)
    content = models.TextField()

    class Meta:
        name = 'blog.template'


class Media(models.Model):
    name = models.CharField(128)
    filepath = models.FilePathField()
    title = models.TextField()

    class Meta:
        name = 'blog.media'


class Document(models.Model):
    STATUS = (
        ('draft', _('Draft')),
        ('published', _('Published')),
        ('archived', _('Archived')),
    )
    parent = models.ForeignKey('self')
    is_public = models.BooleanField(default=True)
    author = models.ForeignKey('auth.user', null=False)
    title = models.CharField(512)
    status = models.SelectionField(
        STATUS, null=False, default='draft',
    )
    content = models.TextField()
    compiled_content = models.TextField()
    template = models.ForeignKey(Template)
    page_type = models.CharField(32, null=False, default='page')
    published_on = models.DateTimeField()
    slug = models.CharField(512)
    searchable = models.BooleanField(default=True, help_text="Display on results search page")

    class Meta:
        name = 'blog.document'

    def save(self, *args, **kwargs):
        if self.page_type is None:
            self.page_type = self.__class__.__name__.lower()
        super(Document, self).save(*args, **kwargs)


class Category(Document):
    parent_left = models.IntegerField(db_index=True)
    parent_right = models.IntegerField(db_index=True)

    class Meta:
        name = 'blog.category'


class Tag(Document):

    class Meta:
        name = 'blog.tag'

    def save(self, *args, **kwargs):
        # Do not show on results page
        self.searchable = False
        super(Tag, self).save(*args, **kwargs)


class Entry(Document):
    category = models.ForeignKey(Category)
    categories = models.ManyToManyField('blog.category')

    class Meta:
        name = 'blog.entry'


class Page(models.Model):
    categories = models.ManyToManyField('blog.category')

    class Meta:
        name = 'blog.page'


class Menu(models.Model):
    parent = models.ForeignKey('self')
    name = models.CharField(128)
    page = models.ForeignKey(Page)

    class Meta:
        name = 'blog.menu'
