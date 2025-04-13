from orun.contrib.admin import actions, register_action, register_menu


@register_action
class CategoryAction(actions.WindowAction):
    model = 'blog.category'


@register_action
class PostAction(actions.WindowAction):
    model = 'blog.post'


@register_menu
class BlogMenu:
    name = 'Blog'
    icon = 'fa fa-blog'

    class Contents:
        name = 'Contents'

        class Post:
            name = 'Posts'
            action = PostAction

        class Category:
            name = 'Categories'
            action = CategoryAction

