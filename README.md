django-attach
=============

django-attach is a [Django](https://www.djangoproject.com) admin plugin for
attaching files to model instances with multiple file selection support. Its main
feature is a custom admin inline form. Requires a modern browser supporting
HTML5 and XMLHttpRequest2, but falls back to the plain django inline form when
these are not available.

### Features:

* Mutiple file selection.
* Files are not uploaded or deleted until the form is submitted.
* Properly handles both editing existing model instances, and adding new
  model instances (incl. validation errors, when uploaded files remain
  associated with a temporary object until the errors are corrected,
  and the instance can be saved).
* Reports upload progress.
* Reports any errors in asynchronous requests if they occur.

The plugin has been tested with Django 3.2.6.

Please report any issues or questions on
[Github Issues](https://github.com/peterkuma/django-attach/issues).

Installation
------------

To install the latest stable release:

    pip3 install django-attach

To install the latest development version, download this repository and run:

    python3 setup.py install

Add the application to `settings.py`:

    INSTALLED_APPS = (
        ...
        'django_attach.apps.DjangoAttachConfig',
        # Your apps follow here.
        ...
    )

Initialize database tables and copy static files:

    python3 manage.py makemigrations
    python3 manage.py migrate
    python3 manage.py collectstatic

Add a generic relation field to your model:

    from django_attach.models import Attachment
    from django.contrib.contenttypes.fields import GenericRelation
    ...

    class MyModel(models.Model):
        ....
        attachments = GenericRelation(Attachment)

This is how you can access attachments in your program.

In `admin.py` of your application, add **AttachmentInline** to the list of
inlines:

    from django_attach.forms import AttachmentInline
    ...

    class MyModelAdmin(admin.ModelAdmin):
        inlines = (AttachmentInline,)

In the admin, you should be able to see the attachment inline under the
change and add pages of your model. You should also see a new application
Django_Attach, where you can edit the raw attachments and temporary objects
(described below) if you ever need to.

It is up to you to implement a meaningful way in which the attachments are
used. One possible use is to allow text fields (e.g. article HTML content)
of the model to reference them directly. You then have to supply a view
which serves the files (e.g. via HTTP redirect) under the appropriate URL.
You may also need to pipe the HTML content through a filter which modifies
the relative links to absolute links (if you display multiple models
under one URL).

Example
-------

Directory [example_project](example_project) contains an example
django project demonstrating the use of django-attach.
Please see `example_project/README.md` for more information.

Reference
---------

### class Attachment(Model)

Attachment objects hold individual files. They are associated with arbitrary
model instances via the
[contenttypes](https://docs.djangoproject.com/en/dev/ref/contrib/contenttypes/)
framework.

**Fields**:

- **file** - attachment file.
- **content_object** - object associated with the attachment.
- **content_type** - ID of ContentType of the associated model.
- **object_id** - primary key of the associated model.
- **created** - datetime when attachment was created.
- **modified** - datatime when attachment was last modified.

You should not rely on file, content\_object, content\_type and object\_id
not being null.

### class Temporary(Model)

Temporary objects. Files attached to instances yet to be saved are associated
with temporary objects. They are removed once the instance is saved.

**Fields**:

- **attachments** - attachments associated with the temporary object.
- **created** - datetime when temporary object was created.
- **modified** - datetime when temporary object was last modified.

### Settings

#### ATTACHMENT_ROOT

Default: 'attachment'

Path where attachments are stored (relative to `MEDIA_ROOT`).

How it works
------------

File selection upon clicking Attach button is implemented using a hidden
`<input type="file" multiple="true">`. Files are uploaded asynchronously
when the model form is submitted. If the instance is yet to be created,
they are associated with a new Temporary object. Once the model instance
is saved, they are re-attached to the instance, and moved in the file storage
to the appropriate location (`MEDIA_ROOT/attachment/<model>/<id>/`).
File deletion is implemented using the ordinary hidden \*-DELETE fields
as in inline formset, submitted synchronously on model form submission.

Known issues
------------

* Stale files (uploaded via the add page of your model, but whose associated
model instance was not eventually saved) need to be removed manually in the
Django_Attach application in the admin. This can be done by removing the old
Temporary objects they are attached to.
* django-attach is not yet fully translatable.

Security considerations
-----------------------

* django-attach is bundled with minified versions of JavaScript libraries
  [d3.js](http://d3js.org/) and [queue](https://github.com/mbostock/queue)
  downloaded from [github.com/mbostock](https://github.com/mbostock).
* django-attach has not yet been well tested with respect to honoring
  django admin model permissions.

License
-------

django-attach is released under the BSD License.
See `LICENSE` and `LICENSE.third-party` for details.

Screenshots
-----------

AttachmentInline displays a list of attachments on a model change page.
Attachments are added by clicking the `Attach file` button. They can renamed,
removed and reverted. Changes are applied when the form is saved.

![](https://github.com/peterkuma/django-attach/raw/master/screenshots/1.png)

![](https://github.com/peterkuma/django-attach/raw/master/screenshots/3.png)

New attachments are uploaded asynchronously when form is submitted. Upload
progress is shown.

![](https://github.com/peterkuma/django-attach/raw/master/screenshots/2.png)

Release Notes
-------------

### 1.2.1 (2021-08-18)

- Support for renaming files.
- Fixed uploading of files on new model instances.
- Fixed removing of new files.

### 1.1.0 (2021-08-14)

- Revert button.
- Indication of new and removed items.
- Fixed progress indication when multiple files are uploaded.
- Fixed remove button on mobile.

### 1.0.0 (2021-05-30)

- Support for Django 3.2.3.

### 0.1.3 (2013-09-11)

- Fixed wrong database name.
- Improved README.

### 0.1, 0.1.1, 0.1.2 (2013-09-06)

- Initial release.
- Support for Django 1.5.
