from orun.urls import path, include

urlpatterns = [
    path('', include('orun.contrib.staticfiles.urls')),
    path('', include('orun.contrib.admin.urls')),
]