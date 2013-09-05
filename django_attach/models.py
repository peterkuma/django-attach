# -*- coding: utf-8 -*-

import os
from django.utils.translation import ugettext_lazy as _
from django.db.models import *
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.generic import GenericForeignKey, GenericRelation
from django.db.models.signals import pre_delete
from django.dispatch.dispatcher import receiver
from django.conf import settings


def attachment_file_upload_to(instance, filename):
    try: root = settings.ATTACHMENT_ROOT
    except AttributeError: root = 'attachment'

    return os.path.join(
        root,
        instance.content_type.app_label,
        unicode(instance.content_type.model),
        unicode(instance.object_id),
        filename
    )


class Attachment(Model):
    class Meta:
        verbose_name = _('attachment')
        verbose_name_plural = _('attachments')

    content_type = ForeignKey(
        ContentType,
        verbose_name=_('content type'),
        null=True,
        blank=True
    )
    object_id = PositiveIntegerField(
        _('object ID'),
        null=True,
        blank=True
    )
    content_object = GenericForeignKey('content_type', 'object_id')
    file = FileField(_('file'), upload_to=attachment_file_upload_to)
    created = DateTimeField(_('created'), auto_now_add=True)
    modified = DateTimeField(_('modified'), auto_now=True)

    def __unicode__(self):
        if self.file:
            return unicode(self.file.name)
        else:
            return u'Attachment object'

    def get_absolute_url(self):
        return self.file.url

    def save(self, *args, **kwargs):
        if not self.content_object:
            t = Temporary()
            t.save()
            self.content_object = t

        name = attachment_file_upload_to(self, os.path.basename(self.file.name))
        if self.pk and name != self.file.name:
            try:
                old_name = self.file.name
                with self.file.storage.open(self.file.name) as f:
                    self.file.save(os.path.basename(self.file.name), f, save=False)
                self.file.storage.delete(old_name)
            except IOError:
                pass

        return super(Attachment, self).save(*args, **kwargs)


@receiver(pre_delete, sender=Attachment)
def attachment_delete(sender, instance, **kwargs):
    instance.file.delete(False)


class Temporary(Model):
    class Meta:
        verbose_name = _('temporary')
        verbose_name_plural = _('temporary')

    attachments = GenericRelation(Attachment)
    created = DateTimeField(_('created'), auto_now_add=True)
    modified = DateTimeField(_('modified'), auto_now=True)
