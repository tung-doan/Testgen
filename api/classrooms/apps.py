from django.apps import AppConfig
import sys

class ClassroomsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "classrooms"

    def ready(self):
        if 'runserver' in sys.argv:
            from .scheduler import start
            start()
