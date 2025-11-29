from django.db import models
from users.models import User  # nếu bạn có custom User model
from django.contrib.auth.hashers import make_password, check_password

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
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.CASCADE, related_name='student_profile')
    
    def create_user_account(self, raw_password=None, date_of_birth=None, email=None):
        if self.user:
            user = self.user
        else:
            username = self.student_id
            user = User.objects.create(username=username, email=email or None)
            self.user = user
            self.save()
            
        if date_of_birth is not None:
            user.date_of_birth = date_of_birth

        if raw_password:
            user.set_password(raw_password)

        user.save()
        return user
    
    def delete(self, *args, **kwargs):
       user = self.user
       super().delete(*args, **kwargs)
       if user:
           try:
               user.delete()
           except Exception as e:
               print(f"Error deleting linked user: {e}")

    @property
    def average_score(self):
        from exam.models import Submission  # tránh import vòng
        submissions = Submission.objects.filter(student=self)
        scores = [s.total_score for s in submissions if s.total_score is not None]
        if scores:
            return round(sum(scores) / len(scores), 2)
        return None
    
    def __str__(self):
        return f"{self.name} (ID: {self.student_id})"