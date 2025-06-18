from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassroomViewSet, StudentViewSet

router = DefaultRouter()

router.register(r'students', StudentViewSet, basename='student')
router.register(r'', ClassroomViewSet, basename='classroom')

urlpatterns = [
    path('', include(router.urls)),
]