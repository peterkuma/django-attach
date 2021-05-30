from django.conf.urls import url

from app.views import *


urlpatterns = [
    url(r'^$', ArticleList.as_view()),
    url(r'^article/(?P<pk>\d+)/$', ArticleDetail.as_view(), name='article'),
    url(r'^article/(?P<article_id>\d+)/(?P<name>[^/]+)$', attachment),
]
