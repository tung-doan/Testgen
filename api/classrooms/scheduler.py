from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

def delete_expired_requests():
    """Xóa các yêu cầu vào lớp đã quá hạn 7 ngày"""
    try:
        from .models import EnrollmentRequest
        seven_days_ago = timezone.now() - timedelta(days=7)
        deleted_count, _ = EnrollmentRequest.objects.filter(
            status='pending', 
            created_at__lt=seven_days_ago
        ).delete()
        
        if deleted_count > 0:
            logger.info(f"Đã tự động xóa {deleted_count} yêu cầu vào lớp quá hạn (hơn 7 ngày).")
    except Exception as e:
        logger.error(f"Lỗi khi xóa yêu cầu quá hạn: {str(e)}")

def start():
    scheduler = BackgroundScheduler()
    # Chạy mỗi 1 ngày (24h)
    scheduler.add_job(delete_expired_requests, 'interval', days=1)
    scheduler.start()
    logger.info("Background Scheduler (APScheduler) đã được khởi động.")
