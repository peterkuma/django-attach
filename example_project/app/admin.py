from django.contrib import admin
from django_attach.forms import AttachmentInline

from app.models import *


class ArticleAdmin(admin.ModelAdmin):
    inlines = (AttachmentInline,)

admin.site.register(Article, ArticleAdmin)
