from orun.db import models


class Category(models.Model):
    name = models.CharField(128, null=False)
    parent = models.ForeignKey('self', null=True, blank=True)
    content = models.TextField()
    private = models.BooleanField(default=False)
    url = models.CharField()

    class Meta:
        name = 'blog.category'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'


class Post(models.Model):
    category = models.ForeignKey(Category)
    title = models.CharField(null=False)
    content = models.TextField(trim=False)
    private = models.BooleanField(default=False)
    published = models.BooleanField(default=True)
    author = models.ForeignKey('auth.user')
    url = models.CharField(512)

    class Meta:
        name = 'blog.post'
        name_field = 'title'
