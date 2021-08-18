# -*- coding: utf-8 -*-

import os
from django import forms
from django.forms.fields import IntegerField
from django.core.exceptions import ValidationError
from django.forms.widgets import HiddenInput
from django.forms.formsets import ManagementForm, TOTAL_FORM_COUNT, INITIAL_FORM_COUNT, MAX_NUM_FORM_COUNT
from django.contrib.contenttypes.admin import GenericInlineModelAdmin
from django.contrib.contenttypes.forms import BaseGenericInlineFormSet
from django.contrib.contenttypes.models import ContentType
from django.contrib.admin import static
from django.core.files.storage import FileSystemStorage

from .models import Attachment, Temporary, attachment_file_upload_to


class AttachmentForm(forms.ModelForm):
    filename = forms.CharField()


class AttachmentManagementForm(ManagementForm):
    def __init__(self, *args, **kwargs):
        self.base_fields['CONTENT_TYPE'] = IntegerField(widget=HiddenInput)
        self.base_fields['OBJECT_ID'] = IntegerField(widget=HiddenInput, required=False)
        super().__init__(*args, **kwargs)


class BaseAttachmentInlineFormSet(BaseGenericInlineFormSet):
    # __init__ copied from contrib/contenttypes/generic.py and modified.
    # May need to be updated continually.
    def __init__(self, data=None, files=None, instance=None, save_as_new=False,
                 prefix=None, queryset=None, **kwargs):
        opts = self.model._meta
        self.instance = instance
        self.rel_name = (
            opts.app_label + '-' + opts.model_name + '-' +
            self.ct_field.name + '-' + self.ct_fk_field.name
        )
        self.save_as_new = save_as_new
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
                self.ct_field.name: ContentType.objects.get_for_model(
                    self.instance, for_concrete_model=self.for_concrete_model),
                self.ct_fk_field.name: self.instance.pk,
            })
        super(BaseGenericInlineFormSet, self).__init__(
            queryset=qs, data=data, files=files,
            prefix=prefix
        )

    @property
    def management_form(self):
        """Return the ManagementForm instance for this FormSet."""
        if self.is_bound:
            form = AttachmentManagementForm(self.data, auto_id=self.auto_id, prefix=self.prefix)
            form.full_clean()
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
        return super().save_existing_objects(commit)

    def get_attachment_by_file(self, filename):
        for form in self.initial_forms:
            if form.instance.file.name == filename:
                return form.instance
        return None

    def rename_existing_file(self, filename, storage):
        path = storage.path(filename)
        new_filename = storage.get_available_name(filename)
        new_path = storage.path(new_filename)
        a = self.get_attachment_by_file(filename)
        if a is None: return False
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        assert(os.path.isfile(path))
        os.rename(path, new_path)
        a.file.name = new_filename
        a.save()
        return True

    def rename_file(self, form, instance):
        storage = instance.file.storage
        filename = instance.file.name
        path = storage.path(filename)
        new_name = storage.get_valid_name(form.cleaned_data['filename'])
        new_filename = attachment_file_upload_to(instance, new_name)
        if new_filename == filename:
            return
        if not isinstance(storage, FileSystemStorage):
            raise NotImplementedError('Renaming attachments in storage other than FileSystemStorage is not supported')
        if storage.exists(new_filename):
            res = self.rename_existing_file(new_filename, storage)
            if res is False:
                # Failed to rename the existing file. We have to get a new
                # available filename.
                new_filename = storage.get_available_name(new_filename)
        new_path = storage.path(new_filename)
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        assert(os.path.isfile(path))
        os.rename(path, new_path)
        instance.file.name = new_filename

    def save_existing(self, form, instance, commit=True):
        """Saves and returns an existing model instance for the given form."""
        t = None
        if type(instance.content_object) == Temporary:
            t = instance.content_object

        setattr(instance, self.ct_field.get_attname(), ContentType.objects.get_for_model(self.instance).pk)
        setattr(instance, self.ct_fk_field.get_attname(), self.instance.pk)

        self.rename_file(form, instance)

        obj = super().save_existing(form, instance, commit)

        # Delete temporary object if not empty.
        if t is not None:
            qs = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(Temporary), object_id=t.pk)
            if len(qs) == 0:
                t.delete()

        return obj


class AttachmentInline(GenericInlineModelAdmin):
    model = Attachment
    form = AttachmentForm
    extra = 0
    template = 'django_attach/attachment_inline.html'
    formset = BaseAttachmentInlineFormSet

    @property
    def media(self):
        return super().media + forms.Media(
            js=[
                'django_attach/js/queue.v1.min.js',
                'django_attach/js/d3.v3.min.js',
                'django_attach/js/attachment_inline.js',
            ],
            css={'screen': ['django_attach/css/attachment_inline.css']},
        )
