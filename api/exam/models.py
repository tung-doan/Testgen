
from django.db import models
from users.models import User  
from classrooms.models import Classroom, Student 
from cloudinary.models import CloudinaryField 
from question_bank.models import Question 
class PaperTest(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    num_questions = models.IntegerField(default=10)
    num_choices = models.IntegerField(default=4)
    allow_multiple_answers = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tests')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True, related_name='tests')
    created_at = models.DateTimeField(auto_now_add=True)
    num_variants = models.IntegerField(default=1)
    
    questions = models.ManyToManyField(
        Question,
        through='PaperTestQuestion',
        related_name='paper_tests'
    )

    def __str__(self):
        return self.title

class PaperTestQuestion(models.Model):
    """Bảng trung gian để lưu câu hỏi trong bài test giấy"""
    test = models.ForeignKey(PaperTest, on_delete=models.CASCADE, related_name='paper_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField(default=1)
    
    class Meta:
        ordering = ['order']
        unique_together = ['test', 'question']

    def __str__(self):
        return f"Question {self.order} for {self.test.title}"
    
    def get_correct_answer_indices(self):
        """
        Trả về list các index đáp án đúng (0-based)
        VD: [0, 2] nếu A và C đúng
        """
        if self.question.question_type == 'MC':
            correct_options = self.question.options.filter(
                is_correct_bool=True
            ).order_by('order').values_list('order', flat=True)
            return list(correct_options)
        
        elif self.question.question_type == 'TFE':
            correct_options = self.question.options.filter(
                is_correct_bool=True
            ).order_by('order').values_list('order', flat=True)
            return list(correct_options)
        
        return []
class PaperTestVariant(models.Model):
    """Mỗi mã đề có thứ tự câu hỏi và đáp án khác nhau"""
    test = models.ForeignKey(PaperTest, on_delete=models.CASCADE, related_name='variants')
    variant_code = models.CharField(max_length=10, help_text="Mã đề: A, B, C, 101, 102...")
    question_order = models.JSONField(help_text="List ID câu hỏi theo thứ tự: [5,2,8,1,3...]")
    answer_shuffles = models.JSONField(help_text="Thứ tự đáp án mỗi câu: {1: [2,0,3,1], 2: [1,3,0,2]...}")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['test', 'variant_code']
        ordering = ['variant_code']
    
    def __str__(self):
        return f"{self.test.title} - Mã đề {self.variant_code}"
    
    def get_answer_key(self):
        """
        Tính đáp án đúng cho variant này
        Returns: {question_index: [correct_indices_after_shuffle]}
        """
        answer_key = {}
        # Prefetch options to avoid N+1 queries (each get_correct_answer_indices() would trigger a query)
        test_questions = {pq.question.id: pq for pq in self.test.paper_questions.select_related('question').prefetch_related('question__options').all()}
        
        for idx, question_id in enumerate(self.question_order):
            paper_question = test_questions.get(question_id)
            if not paper_question:
                continue
            
            # Đáp án đúng gốc
            original_correct = paper_question.get_correct_answer_indices()
            
            # Thứ tự shuffle của câu này
            shuffle_map = self.answer_shuffles.get(str(question_id), list(range(4)))
            
            # Tính vị trí mới của đáp án đúng
            new_correct = [shuffle_map.index(orig) for orig in original_correct if orig in shuffle_map]
            
            answer_key[idx] = new_correct
        
        return answer_key
class PaperSubmission(models.Model):
    test = models.ForeignKey(PaperTest, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='submissions', null=True, blank=True)
    variant = models.ForeignKey(PaperTestVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name='submissions')
    detected_mssv = models.CharField(max_length=20, blank=True, null=True, help_text="MSSV detected from OMR bubbles")
    submission_image = CloudinaryField(
        'submission_images',
        folder='testgen/submissions',
        null=True,
        blank=True,
        resource_type='image'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    total_score = models.FloatField(default=0.0)

    def __str__(self):
        return f"Submission by {self.user.username} for {self.test.title}"

class PaperAnswerDetected(models.Model):
    submission = models.ForeignKey(PaperSubmission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(PaperTestQuestion, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    score = models.FloatField(default=0.0)


    def __str__(self):
        return f"Answer for question {self.question.id} in submission {self.submission.id}"

class PaperUserAnswer(models.Model):
    submission = models.ForeignKey(PaperSubmission, on_delete=models.CASCADE, related_name='user_answers')
    question = models.ForeignKey(PaperTestQuestion, on_delete=models.CASCADE, related_name='user_answers')
    selected_options = models.JSONField(default=list, help_text="List of selected option indices")
     
    def __str__(self):
        return f"User's answer to question {self.question.id} in submission {self.submission.id}"