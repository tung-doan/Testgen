from django.db import models
from django.utils import timezone
from users.models import User

class Subject(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='subjects')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
    
    def __str__(self):
        return self.name

class Chapter(models.Model):
    name = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='chapters')
    order = models.IntegerField(default=0, help_text="Thứ tự chương (1, 2, 3...)")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['subject', 'order', 'name']
        unique_together = ['subject', 'order']  # Đảm bảo order unique trong 1 subject
        verbose_name = 'Chapter'
        verbose_name_plural = 'Chapters'
    
    def __str__(self):
        return f"{self.subject.name} - Ch{self.order}: {self.name}"

class Section(models.Model):
    name = models.CharField(max_length=255)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='sections')
    order = models.IntegerField(default=0, help_text="Thứ tự mục (1, 2, 3...)")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['chapter', 'order', 'name']
        unique_together = ['chapter', 'order']  # Đảm bảo order unique trong 1 chapter
        verbose_name = 'Section'
        verbose_name_plural = 'Sections'
    
    def __str__(self):
        return f"{self.chapter.name} - Sec{self.order}: {self.name}"

class Question(models.Model):
    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'MC', 'Multiple Choice'
        TRUE_FALSE_EXTENDED = 'TFE', 'True/False Extended'
        ORDERING = 'ORD', 'Ordering'
        FILL_IN_BLANK = 'FIB', 'Fill in the Blank'

    # Liên kết với ngân hàng
    section = models.ForeignKey(Section, on_delete=models.PROTECT, related_name='questions')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='questions')

    prompt = models.TextField(help_text="Nội dung câu hỏi")
    question_type = models.CharField(
        max_length=3, 
        choices=QuestionType.choices, 
        default=QuestionType.MULTIPLE_CHOICE
    )
    
    points = models.FloatField(default=1.0, help_text="Điểm tối đa cho câu hỏi này")
    
    # Dùng cho Fill in the Blanks
    correct_answer_text = models.TextField(
        blank=True, 
        null=True, 
        help_text="Đáp án text cho Fill in the Blanks"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Soft delete flag")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        indexes = [
            models.Index(fields=['section', 'is_active']),
            models.Index(fields=['question_type']),
        ]
    
    def __str__(self):
        return self.prompt[:50]

class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.TextField(help_text="Nội dung lựa chọn")
    
    # 1. Multiple Choice (% điểm)
    score_percentage = models.FloatField(
        default=0.0, 
        help_text="MC: 100.0 = đúng hoàn toàn, 50.0 = đúng một phần, 0.0 = sai"
    )
    
    # 2. True/False Extended
    is_correct_bool = models.BooleanField(
        null=True, 
        blank=True, 
        help_text="TFE: True/False - đáp án đúng"
    )
    
    # 3. Ordering
    correct_order = models.IntegerField(
        null=True, 
        blank=True, 
        help_text="ORD: Thứ tự đúng (1, 2, 3...)"
    )
    
    order = models.IntegerField(default=0, help_text="Thứ tự hiển thị (A=0, B=1, C=2...)")
    
    class Meta:
        ordering = ['question', 'order']
        verbose_name = 'Answer Option'
        verbose_name_plural = 'Answer Options'
    
    def __str__(self):
        return f"{self.text[:30]} (Q: {self.question.id})"
    
    @property
    def is_correct(self):
        """Helper property để check đáp án đúng cho mọi loại câu hỏi"""
        if self.score_percentage > 0:  # Multiple Choice
            return True
        if self.is_correct_bool is not None:  # True/False
            return self.is_correct_bool
        return False