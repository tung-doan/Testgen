from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

@shared_task
def publish_due_exams():
    """Auto-publish online exams whose scheduled publish time has passed."""
    from .models import Exam
    now = timezone.now()
    due_exams = Exam.objects.filter(
        is_published=False,
        publish_at__isnull=False,
        publish_at__lte=now,
    )
    updated_count = due_exams.update(is_published=True)

    if updated_count > 0:
        logger.info(f"Auto-published {updated_count} scheduled online exam(s).")

    return updated_count

@shared_task
def auto_expire_attempts():
    """Auto-complete IN_PROGRESS attempts that have exceeded their exam duration."""
    from .models import ExamAttempt
    now = timezone.now()
    expired_count = 0
    
    in_progress_attempts = ExamAttempt.objects.filter(
        status='IN_PROGRESS'
    ).select_related('exam')
    
    for attempt in in_progress_attempts:
        deadline = attempt.start_time + timedelta(minutes=attempt.exam.duration_minutes)
        if now > deadline:
            try:
                attempt.auto_complete()
                expired_count += 1
            except Exception as e:
                logger.error(f"Error auto-completing attempt {attempt.id}: {e}")
    
    if expired_count > 0:
        logger.info(f"Auto-expired {expired_count} timed-out exam attempt(s).")
    
    return expired_count
