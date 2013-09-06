from django.conf.urls import patterns, url

from app.views import *


urlpatterns = patterns('',
    url(r'^$', ArticleList.as_view()),
    url(r'^article/(?P<pk>\d+)/$', ArticleDetail.as_view(), name='article'),
    url(r'^article/(?P<article_id>\d+)/(?P<name>[^/]+)$', attachment),
)
