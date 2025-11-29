# users/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from rest_framework_simplejwt.tokens import RefreshToken

class User(AbstractUser):
    # ROLE_CHOICES = [
    #     ('teacher', 'Teacher'),
    #     ('student', 'Student'),
    # ]

    username = models.CharField(max_length=150,unique=True, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True, db_index= True, blank=True, null = True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    gender = models.CharField(max_length=10, choices = GENDER_CHOICES, null=True, blank=True)
    is_authorized = models.BooleanField(default=False)
    # class Meta:
    #     db_table = 'users'
    #     managed = True
        
    def __str__(self) -> str:
        return self.username
    
    def tokens(self):
        refresh = RefreshToken.for_user(self)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        }
