from django.apps import AppConfig
import sys


class OnlineExamsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "online_exams"

    def ready(self):
        pass
