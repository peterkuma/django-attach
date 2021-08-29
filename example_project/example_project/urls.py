from django.conf.urls import include
from django.urls import path
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf.urls.static import static
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

import app

urlpatterns = [
    # Examples:
    # url(r'^$', 'example_project.views.home', name='home'),
    # url(r'^example_project/', include('example_project.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    path('admin/django_attach/', include('django_attach.urls')),
    path('admin/', admin.site.urls),
    path('', include('app.urls')),
] \
+ staticfiles_urlpatterns() \
+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
