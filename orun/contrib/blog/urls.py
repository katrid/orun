from orun.urls import path, re_path

from . import views


urlpatterns = [
    path('category/<int:category_id>/', views.category),
    path('post/<int:post_id>/', views.post),
]
