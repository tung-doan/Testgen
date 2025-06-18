from django.db import models
from users.models import User  # nếu bạn có custom User model

class Classroom(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='classrooms', null=True, blank=True) 

    def __str__(self):
        return self.name

class Student(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='students')
    name = models.CharField(max_length=100)
    student_id = models.CharField(max_length=20, unique=True) 
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def average_score(self):
        from exam.models import Submission  # import tại đây để tránh vòng lặp import
        submissions = Submission.objects.filter(student=self)
        scores = [s.total_score for s in submissions if s.total_score is not None]
        if scores:
            return round(sum(scores) / len(scores), 2)
        return None
    
    def __str__(self):
        return f"{self.name} (ID: {self.student_id})"