from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassroomViewSet, StudentViewSet, get_student_classroom_info

router = DefaultRouter()

router.register(r'students', StudentViewSet, basename='student')
router.register(r'', ClassroomViewSet, basename='classroom')

urlpatterns = [
    path('student-info/', get_student_classroom_info, name='student-classroom-info'),
    path('', include(router.urls)),
]