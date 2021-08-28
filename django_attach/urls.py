from django.urls import path
from django.views.i18n import JavaScriptCatalog

urlpatterns = [
    path('jsi18n/', JavaScriptCatalog.as_view(packages=['django_attach']),
        name='javascript-catalog')
]
