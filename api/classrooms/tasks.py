from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_requests():
    """Delete pending enrollment requests and teacher invitations older than 7 days"""
    try:
        from .models import EnrollmentRequest
        seven_days_ago = timezone.now() - timedelta(days=7)
        deleted_count, _ = EnrollmentRequest.objects.filter(
            status='pending', 
            created_at__lt=seven_days_ago
        ).delete()
        
        if deleted_count > 0:
            logger.info(f"Auto-deleted {deleted_count} expired enrollment request(s)/invitation(s) (older than 7 days).")
    except Exception as e:
        logger.error(f"Error deleting expired requests: {str(e)}")
