from django.db import models
from users.models import User  # nếu bạn có custom User model
from classrooms.models import Classroom, Student  # nếu bạn có model Classroom

class Test(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    num_questions = models.IntegerField(default=10)
    num_choices = models.IntegerField(default=4)
    allow_multiple_answers = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tests')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True, related_name='tests')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Question(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    correct_answer = models.CharField(max_length=255)
    score = models.FloatField(default=1.0)

    def __str__(self):
        return f"Question {self.id} for {self.test.title}"

class Submission(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='submissions', null=True, blank=True)
    submission_image = models.ImageField(upload_to='submission_images/', null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    total_score = models.FloatField(default=0.0)

    def __str__(self):
        return f"Submission by {self.user.username} for {self.test.title}"

class AnswerDetected(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    score = models.FloatField(default=0.0)
    confidence = models.FloatField(default=0.0)  # Confidence score from CV

    def __str__(self):
        return f"Answer for question {self.question.id} in submission {self.submission.id}"

class UserAnswer(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='user_answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='user_answers')
    selected_option = models.CharField(max_length=10)  # Lưu một lựa chọn duy nhất
     
    def __str__(self):
        return f"User's answer to question {self.question.id} in submission {self.submission.id}"