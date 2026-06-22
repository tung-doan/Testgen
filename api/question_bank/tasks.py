from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task
def purge_deleted_questions():
    """Permanently delete questions that have been soft-deleted (is_active=False) for more than 30 days."""
    try:
        from .models import Question
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        deleted_count, _ = Question.objects.filter(
            is_active=False,
            updated_at__lt=thirty_days_ago
        ).delete()
        
        if deleted_count > 0:
            logger.info(f"Permanently deleted {deleted_count} question(s) that were in trash for over 30 days.")
    except Exception as e:
        logger.error(f"Error purging deleted questions: {str(e)}")
