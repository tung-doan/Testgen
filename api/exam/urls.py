from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.omr_views import TestViewSet, SubmissionViewSet, StatisticViewSet

router = DefaultRouter()
router.register(r'tests', TestViewSet, basename='test')
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'statistics', StatisticViewSet , basename='statistics')

urlpatterns = [
    path('', include(router.urls)),
]
