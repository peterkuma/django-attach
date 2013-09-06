from django.db import models
from django.core.urlresolvers import reverse
from django.contrib.contenttypes.generic import GenericRelation
from django_attach.models import Attachment


class Article(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    attachments = GenericRelation(Attachment)

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('article', kwargs={'pk': str(self.pk)})
