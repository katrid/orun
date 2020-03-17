from orun.urls import path, re_path

from . import views


urlpatterns = [
    path('pwa/', views.index),
    path('pwa/service-worker.js', views.service_worker_js),
    path('pwa/js/templates/', views.manifest_json),
    path('pwa/sync/', views.sync),
]
