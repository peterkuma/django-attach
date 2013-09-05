# -*- coding: utf-8 -*-

from django import forms
from django.forms.fields import IntegerField
from django.core.exceptions import ValidationError
from django.forms.widgets import HiddenInput
from django.forms.formsets import ManagementForm, TOTAL_FORM_COUNT, INITIAL_FORM_COUNT, MAX_NUM_FORM_COUNT
from django.contrib.contenttypes.generic import GenericInlineModelAdmin, BaseGenericInlineFormSet
from django.contrib.contenttypes.models import ContentType
from django.contrib.admin.templatetags.admin_static import static

from .models import Attachment, Temporary


class AttachmentManagementForm(ManagementForm):
    def __init__(self, *args, **kwargs):
        self.base_fields['CONTENT_TYPE'] = IntegerField(widget=HiddenInput)
        self.base_fields['OBJECT_ID'] = IntegerField(widget=HiddenInput, required=False)
        super(AttachmentManagementForm, self).__init__(*args, **kwargs)


class BaseAttachmentInlineFormSet(BaseGenericInlineFormSet):
    # __init__ copied from contrib/contenttypes/generic.py and modified.
    # May need to be updated continually.
    def __init__(self, data=None, files=None, instance=None, save_as_new=None,
                 prefix=None, queryset=None):
        # Avoid a circular import.
        from django.contrib.contenttypes.models import ContentType
        opts = self.model._meta
        self.instance = instance
        self.rel_name = '-'.join((
            opts.app_label, opts.object_name.lower(),
            self.ct_field.name, self.ct_fk_field.name,
        ))
        if self.instance is None or self.instance.pk is None:
            content_type = None
            object_id = None
            if data is not None:
                try:    
                    content_type = int(data[self.rel_name+'-CONTENT_TYPE'])
                    object_id = int(data[self.rel_name+'-OBJECT_ID'])
                except (KeyError, ValueError):
                    pass

            if content_type is not None and object_id is not None:
                if queryset is None:
                    queryset = self.model._default_manager
                qs = queryset.filter(**{
                    self.ct_field.name: ContentType.objects.get_for_id(content_type),
                    self.ct_fk_field.name: object_id,
                })
            else:
                qs = self.model._default_manager.none()
        else:
            if queryset is None:
                queryset = self.model._default_manager
            qs = queryset.filter(**{
                self.ct_field.name: ContentType.objects.get_for_model(self.instance),
                self.ct_fk_field.name: self.instance.pk,
            })
        super(BaseGenericInlineFormSet, self).__init__(
            queryset=qs, data=data, files=files,
            prefix=prefix
        )

    @property
    def management_form(self):
        """Returns the ManagementForm instance for this FormSet."""
        if self.is_bound:
            form = AttachmentManagementForm(self.data, auto_id=self.auto_id, prefix=self.prefix)
            if not form.is_valid():
                raise ValidationError('ManagementForm data is missing or has been tampered with')
        else:
            form = AttachmentManagementForm(auto_id=self.auto_id, prefix=self.prefix, initial={
                TOTAL_FORM_COUNT: self.total_form_count(),
                INITIAL_FORM_COUNT: self.initial_form_count(),
                MAX_NUM_FORM_COUNT: self.max_num,
                'CONTENT_TYPE': ContentType.objects.get_for_model(self.instance).pk,
                'OBJECT_ID': self.instance.pk,
            })
        return form

    def save_existing_objects(self, commit=True):
        for form in self.initial_forms:
            form.has_changed = lambda: True  # Hack.
        return super(BaseAttachmentInlineFormSet, self).save_existing_objects(commit)

    def save_existing(self, form, instance, commit=True):
        """Saves and returns an existing model instance for the given form."""
        t = None
        if type(instance.content_object) == Temporary:
            t = instance.content_object

        setattr(instance, self.ct_field.get_attname(), ContentType.objects.get_for_model(self.instance).pk)
        setattr(instance, self.ct_fk_field.get_attname(), self.instance.pk)
        obj = super(BaseAttachmentInlineFormSet, self).save_existing(form, instance, commit)

        # Delete temporary object if not empty.
        if t is not None:
            qs = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(Temporary), object_id=t.pk)
            if len(qs) == 0:
                t.delete()

        return obj


class AttachmentInline(GenericInlineModelAdmin):
    model = Attachment
    extra = 0
    template = 'django_attach/attachment_inline.html'
    formset = BaseAttachmentInlineFormSet

    @property
    def media(self):
        return super(AttachmentInline, self).media + forms.Media(
            js=[
                static('django_attach/js/queue.v1.min.js'),
                static('django_attach/js/d3.v3.min.js'),
                static('django_attach/js/attachment_inline.js'),
            ],
            css={'screen': [static('django_attach/css/attachment_inline.css')]},
        )
