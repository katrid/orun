from orun.http import HttpRequest, Http404
from .models import Post, Category


def post(request: HttpRequest, post_id):
    try:
        Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        raise Http404('Page not found!')


def category(request: HttpRequest, category_id: int):
    try:
        Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        raise Http404('Page not found!')
