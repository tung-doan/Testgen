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
    classrooms = models.ManyToManyField(Classroom, related_name='students')
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

        # Sync full name to first_name
        user.first_name = self.name

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
        from exam.models import PaperSubmission
        from online_exams.models import ExamAttempt
        
        # Get paper test scores
        paper_submissions = PaperSubmission.objects.filter(student=self)
        paper_scores = [s.total_score for s in paper_submissions if s.total_score is not None]
        
        # Get online exam scores (completed only)
        online_attempts = ExamAttempt.objects.filter(student=self, status='COMPLETED')
        online_scores = [a.final_score for a in online_attempts if a.final_score is not None]
        
        all_scores = paper_scores + online_scores
        if all_scores:
            return round(sum(all_scores) / len(all_scores), 2)
        return None

    def get_classroom_average_score(self, classroom_id):
        from exam.models import PaperSubmission
        from online_exams.models import ExamAttempt
        
        # Get paper test scores for this classroom
        paper_submissions = PaperSubmission.objects.filter(student=self, test__classroom_id=classroom_id)
        paper_scores = [s.total_score for s in paper_submissions if s.total_score is not None]
        
        # Get online exam scores for this classroom
        online_attempts = ExamAttempt.objects.filter(student=self, exam__classroom_id=classroom_id, status='COMPLETED')
        online_scores = [a.final_score for a in online_attempts if a.final_score is not None]
        
        all_scores = paper_scores + online_scores
        if all_scores:
            return round(sum(all_scores) / len(all_scores), 2)
        return None
    
    def __str__(self):
        return f"{self.name} (ID: {self.student_id})"


class EnrollmentRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    REQUEST_TYPE_CHOICES = [
        ('student_request', 'Student Request'),
        ('teacher_invitation', 'Teacher Invitation'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollment_requests')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollment_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES, default='student_request')
    invited_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='sent_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'classroom', 'request_type')
        ordering = ['-created_at']

    def __str__(self):
        type_label = 'invited' if self.request_type == 'teacher_invitation' else 'requested'
        return f"{self.student.name} -> {self.classroom.name} ({type_label}, {self.status})"