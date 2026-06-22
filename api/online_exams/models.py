from django.db import models
from users.models import User
from classrooms.models import Classroom, Student
from question_bank.models import Question # IMPORT TỪ APP MỚI
from django.utils import timezone

class Exam(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_exams')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True)

    # Cấu hình thi online
    duration_minutes = models.IntegerField(default=45)
    max_attempts = models.IntegerField(default=1)
    show_results_immediately = models.BooleanField(default=True)
    # Publish control: whether the exam is immediately published and visible to students
    is_published = models.BooleanField(default=True)
    # If scheduled publishing is desired, store the datetime to publish
    publish_at = models.DateTimeField(null=True, blank=True)

    # Liên kết tới Ngân hàng câu hỏi
    questions = models.ManyToManyField(
        Question, 
        through='ExamQuestion', # Dùng bảng trung gian
        related_name='exams'
    )
    generation_config = models.JSONField(null=True, blank=True, help_text="Cấu hình sinh đề tự động")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
class ExamQuestion(models.Model):
    """Bảng trung gian để lưu điểm và thứ tự câu hỏi cho MỘT đề thi"""
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(help_text="Thứ tự câu hỏi (1, 2, 3...)")
    points = models.FloatField(default=1.0, help_text="Số điểm cho câu hỏi này")

    class Meta:
        ordering = ['order']
        unique_together = ('exam', 'question')

class ExamAttempt(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=20, default='IN_PROGRESS') # IN_PROGRESS, COMPLETED

    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    final_score = models.FloatField(null=True, blank=True)

    @property
    def is_expired(self):
        """Check if this attempt has exceeded the exam's duration"""
        if self.status == 'COMPLETED':
            return False
        from datetime import timedelta
        deadline = self.start_time + timedelta(minutes=self.exam.duration_minutes)
        return timezone.now() > deadline

    def auto_complete(self):
        """Auto-complete an expired attempt by grading whatever answers exist"""
        from .grading import grade_question, convert_to_scale_10

        total_raw_score = 0.0
        total_max_raw_score = 0.0

        # Grade all existing answers
        for answer in self.answers.all():
            try:
                exam_question = ExamQuestion.objects.get(
                    exam=self.exam,
                    question=answer.question
                )
                total_max_raw_score += exam_question.points
                total_raw_score += answer.score
            except ExamQuestion.DoesNotExist:
                continue

        # Add remaining unanswered questions to max score
        answered_question_ids = set(self.answers.values_list('question_id', flat=True))
        unanswered = ExamQuestion.objects.filter(exam=self.exam).exclude(question_id__in=answered_question_ids)
        for eq in unanswered:
            total_max_raw_score += eq.points

        self.status = 'COMPLETED'
        self.end_time = timezone.now()
        self.final_score = convert_to_scale_10(total_raw_score, total_max_raw_score)
        self.save()

class OnlineAnswer(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    # MC: {'selected_options': [1, 3]}
    # TFE: {'responses': [true, false, true, true]}
    # Ordering: {'order': [3, 1, 4, 2]}
    # FIB: {'text': 'uhkhkj'}
    answer_data = models.JSONField(null=True, blank=True)
    score = models.FloatField(default=0.0) # Điểm đạt được cho câu này