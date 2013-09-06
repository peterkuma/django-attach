import os
from django.views import generic
from django.shortcuts import get_object_or_404
from django.http import HttpResponseRedirect, Http404

from app.models import Article


class ArticleList(generic.ListView):
    model = Article


class ArticleDetail(generic.DetailView):
    model = Article


def attachment(request, article_id, name):
    article = get_object_or_404(Article, pk=article_id)
    for a in article.attachments.all():
        if os.path.basename(a.file.name) == name:
            return HttpResponseRedirect(a.file.url)
    raise Http404
