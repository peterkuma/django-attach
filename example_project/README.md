django-attach example
=====================

This is an example django project demonstrating how to use django-attach.
The project requires markdown and BeautifulSoup to run properly:

    pip install markdown
    pip install BeautifulSoup

You can run the server in the usual way:

    python manage.py runserver

The admin interface will be available at
[localhost:8000/admin/](http://localhost:8000/admin/). Log in with:

Username: **admin**  
Password: **admin**

The project contains an application `app`, which defines model `Article`.
The field

    attachments = GenericRelation(Attachment)

gives you access to the attached files. The ArticleAdmin class lists
**AttachmentInline** in `inlines`, which ensures that a custom django-attach
inline formset is shown on the change page of the model in the admin interface.

There are three views defined: `ArticleList`, `ArticleDetail` and `attachment`.
`ArticleList` produces an overview of articles on the home page, `ArticleDetail`
displays a single article under `/article/<pk>/`, and `attachment` is
responsible for serving attachments at `/article/<pk>/<name>`. Attachments can
therefore be referenced by their simple name when shown by `ArticleDetail`.
However, the overview of articles requires that the links are converted to their
absolute counterparts. This is done by the **baseurl** filter
(`app/templatetags/baseurl.py`).

`baseurl` uses [BeautifulSoup](https://pypi.python.org/pypi/BeautifulSoup)
to extend references to attachments in links, images and style attributes.
Feel free to use it in your own project, but note that it is by no means
complete (there are many more possibilities where references can occur).

The `attachment` view serves files by issuing a HTTP redirect to the correct
location under `MEDIA_URL`. Therefore, requests are handled by the
HTTP server if you use any (and not by django).
