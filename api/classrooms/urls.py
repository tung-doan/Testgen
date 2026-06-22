from django.urls import path, include
# pyrefly: ignore [missing-import]
from rest_framework.routers import DefaultRouter
from .views import (
    ClassroomViewSet, StudentViewSet, get_student_classroom_info,
    all_classrooms_list, create_enrollment_request,
    get_enrollment_requests, handle_enrollment_request,
    get_my_enrolled_classrooms, get_enrollment_requests_count,
    invite_student, get_my_invitations, get_my_invitations_count, handle_invitation
)

router = DefaultRouter()

router.register(r'students', StudentViewSet, basename='student')
router.register(r'', ClassroomViewSet, basename='classroom')

urlpatterns = [
    path('student-info/', get_student_classroom_info, name='student-classroom-info'),
    path('all/', all_classrooms_list, name='all-classrooms'),
    path('enrollment-requests/', create_enrollment_request, name='create-enrollment-request'),
    path('<int:classroom_id>/enrollment-requests/', get_enrollment_requests, name='get-enrollment-requests'),
    path('<int:classroom_id>/enrollment-requests/count/', get_enrollment_requests_count, name='enrollment-requests-count'),
    path('enrollment-requests/<int:request_id>/action/', handle_enrollment_request, name='handle-enrollment-request'),
    path('my-classes/', get_my_enrolled_classrooms, name='my-enrolled-classrooms'),
    # Teacher invitation endpoints
    path('<int:classroom_id>/invite-student/', invite_student, name='invite-student'),
    # Student invitation endpoints
    path('my-invitations/', get_my_invitations, name='my-invitations'),
    path('my-invitations/count/', get_my_invitations_count, name='my-invitations-count'),
    path('invitations/<int:invitation_id>/action/', handle_invitation, name='handle-invitation'),
    path('', include(router.urls)),
]