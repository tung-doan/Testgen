from django.core.management.base import BaseCommand

from online_exams.scheduler import publish_due_exams


class Command(BaseCommand):
    help = "Publish online exams whose scheduled publish time has passed."

    def handle(self, *args, **options):
        updated_count = publish_due_exams()
        self.stdout.write(
            self.style.SUCCESS(
                f"Published {updated_count} exam(s) that were due."
            )
        )
