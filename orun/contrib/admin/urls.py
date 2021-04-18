from orun.urls import path, re_path

from . import views


urlpatterns = [
    path('web/', views.client.index),
    path('web/login/', views.client.login),
    path('web/logout/', views.client.logout),
    path('web/js/templates/', views.client.js_templates),
    path('web/content/<int:content_id>/', views.client.content),
    path('web/content/upload/', views.client.upload_attachment),
    path('web/file/upload/<model>/<meth>/', views.client.upload_file),
    path('web/data/reorder/', views.client.reorder),
    path('web/image/<model>/<field>/<id>/', views.client.image),
    path('web/company/logo/', views.client.company_logo),
    path('web/reports/<path:path>', views.client.report),
    # path('web/test/', views.test.qunit),

    path('api/rpc/<service>/<meth>/', views.api.rpc),
    path('api/view/<service>/', views.api.view),
    path('api/field/choices/<service>/<field>/', views.api.choices),
    path('api/app/settings/', views.api.app_settings),
    path('api/public/query/<int:id>/', views.api.public_query),
]
