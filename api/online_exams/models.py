from django.db import models
from users.models import User
from classrooms.models import Classroom, Student
from question_bank.models import Question # IMPORT TỪ APP MỚI

class Exam(models.Model):
    title = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_exams')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True)

    # Cấu hình thi online
    duration_minutes = models.IntegerField(default=45)
    max_attempts = models.IntegerField(default=1)
    show_results_immediately = models.BooleanField(default=True)

    # Liên kết tới Ngân hàng câu hỏi
    questions = models.ManyToManyField(
        Question, 
        through='ExamQuestion', # Dùng bảng trung gian
        related_name='exams'
    )
    generation_config = models.JSONField(null=True, blank=True, help_text="Cấu hình sinh đề tự động")

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
    """Một lượt làm bài của sinh viên"""
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=20, default='IN_PROGRESS') # IN_PROGRESS, COMPLETED

    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    final_score = models.FloatField(null=True, blank=True)

class OnlineAnswer(models.Model):
    """Lưu câu trả lời (dạng JSON) cho 1 câu hỏi trong 1 lượt làm bài"""
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    # Dùng JSON để lưu mọi loại đáp án
    # MC: {'selected_options': [1, 3]} (IDs của AnswerOption)
    # TFE: {'responses': [true, false, true, true]}
    # Ordering: {'order': [3, 1, 4, 2]} (IDs của AnswerOption theo thứ tự)
    # FIB: {'text': 'Paris'}
    answer_data = models.JSONField(null=True, blank=True)
    score = models.FloatField(default=0.0) # Điểm đạt được cho câu này