from orun.apps import AppConfig


class BlogConfig(AppConfig):
    version = '0.1'
    installable = True
    default_language = 'en-us'
    name = 'blog'
    verbose_name = 'Blog'
    fixtures = [
        'blog.admin',
    ]
