# -*- coding: utf-8 -*-

from django.contrib import admin
from django.forms.models import modelform_factory
from django.http import HttpResponse, HttpResponseForbidden
import json

from .models import *
from .forms import AttachmentInline


class TemporaryAdmin(admin.ModelAdmin):
    list_display = ('id', 'created', 'modified')
    fields = ('id', 'created', 'modified')
    readonly_fields = ('id', 'created', 'modified')
    inlines = (AttachmentInline,)


class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('__unicode__', 'content_object', 'created', 'modified')
    list_filter = ('content_type',)
    fields = ('id', 'created', 'modified', 'content_type', 'object_id', 'file')
    readonly_fields = ('id', 'created', 'modified')

    def add_view(self, request, form_url='', extra_context=None):
        if not self.has_add_permission(request):
            raise PermissionDenied

        if request.method == 'POST' and \
          request.META.get('HTTP_ACCEPT') == 'application/json':

        # if request.method == 'POST':
            AttachmentForm = modelform_factory(Attachment)
            form = AttachmentForm(request.POST, request.FILES)
            if form.is_valid():
                attachment = form.save(commit=False)

                if all(k in request.POST for k in ('content_type', 'object_id')):
                    attachment.content_type = ContentType.objects.get_for_id(request.POST['content_type'])
                    attachment.object_id = request.POST['object_id']
                attachment.save()

                return HttpResponse(json.dumps({
                    'id': attachment.id,
                    'content_type': attachment.content_type.pk,
                    'object_id': attachment.object_id,
                }), content_type='application/json')
            else:
                return HttpResponseForbidden(json.dumps({
                    'errors': form.errors
                }), content_type='application/json')
        else:
            return super(AttachmentAdmin, self).add_view(
                request,
                form_url,
                extra_context=extra_context
            )

admin.site.register(Temporary, TemporaryAdmin)
admin.site.register(Attachment, AttachmentAdmin)
