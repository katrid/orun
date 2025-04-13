from orun.apps import AppConfig


class BlogConfig(AppConfig):
    version = '0.1'
    installable = True
    default_language = 'en-us'
    name = 'orun.contrib.blog'
    verbose_name = 'Blog'
    fixtures = [
        'blog.admin',
    ]
    dependencies = ['orun.contrib.auth']
