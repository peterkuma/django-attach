from django.apps import AppConfig
from django.utils.translation import ugettext_lazy as _


class DjangoAttachConfig(AppConfig):
    default_auto_field = 'django.db.models.AutoField'
    name = 'django_attach'
    verbose_name = _('Django Attach')
