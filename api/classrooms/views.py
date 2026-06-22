from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from django.db import IntegrityError
from .models import Classroom, Student, EnrollmentRequest
from .serializers import (
    ClassroomSerializer, ClassroomCreateSerializer, StudentSerializer,
    AllClassroomSerializer, EnrollmentRequestSerializer, EnrollmentRequestActionSerializer,
    InvitationSerializer
)
from exam.models import PaperSubmission
from django.shortcuts import get_object_or_404

class ClassroomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClassroomCreateSerializer
        return ClassroomSerializer

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.teacher != request.user:
            return Response({"error": "You are not authorized to delete this class."}, status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def students(self, request, pk=None):
        classroom = self.get_object()
        students = Student.objects.filter(classrooms=classroom).prefetch_related('classrooms')
        students_data = []

        for student in students:
            submission = PaperSubmission.objects.filter(student=student).first()
            if submission:
                student.submission = submission
            students_data.append(student)

        serializer = StudentSerializer(students_data, many=True, context={'classroom_id': classroom.id})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classroom_info(request):
    try:
        student_pk = request.query_params.get('student_id')
        
        if not student_pk:
            return Response(
                {'error': 'student_id query parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student_pk = int(student_pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'student_id must be a valid integer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            requesting_student = Student.objects.prefetch_related(
                'classrooms__teacher'
            ).select_related('user').get(id=student_pk)
        except Student.DoesNotExist:
            return Response(
                {'error': f'Student with id {student_pk} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        all_classmates = Student.objects.filter(
            classrooms__in=requesting_student.classrooms.all()
        ).select_related('user').distinct().order_by('name')

        classrooms_data = []
        for classroom in requesting_student.classrooms.all():
            teacher_info = None
            if classroom.teacher:
                teacher_info = {
                    'name': classroom.teacher.username,
                    'email': classroom.teacher.email or 'N/A',
                    'avatar': classroom.teacher.avatar.url if classroom.teacher.avatar else None,
                }
            
            classrooms_data.append({
                'id': classroom.id,
                'name': classroom.name,
                'description': classroom.description,
                'teacher': teacher_info,
                'total_students': classroom.students.count(),
            })

        classmates_data = [{
            'id': classmate.id,
            'name': classmate.name,
            'student_id': classmate.student_id,
            'date_of_birth': classmate.user.date_of_birth if classmate.user else None,
            'average_score': classmate.average_score,
            'is_current_user': classmate.id == requesting_student.id
        } for classmate in all_classmates]
        
        return Response({
            'student': {
                'id': requesting_student.id,
                'name': requesting_student.name,
                'student_id': requesting_student.student_id,
            },
            'classrooms': classrooms_data,
            'classmates': classmates_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer

    def get_queryset(self):
        return Student.objects.filter(classrooms__teacher=self.request.user).distinct()
    
    @action(detail=True, methods=['post'], url_path='remove-from-classroom')
    def remove_from_classroom(self, request, pk=None):
        student = self.get_object()
        classroom_id = request.data.get('classroom_id')
        
        classroom = get_object_or_404(Classroom, id=classroom_id)
        if classroom.teacher != request.user:
            return Response(
                {"error": "You don't have permission"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student.classrooms.remove(classroom)

        # Cleanup enrollment request rows to allow future re-join requests
        EnrollmentRequest.objects.filter(student=student, classroom=classroom).delete()
        
        # If student has no more classrooms, optionally delete
        if not student.classrooms.exists():
            student.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='remove-from-classroom-self')
    def remove_from_classroom_self(self, request):
        """Student can remove themselves from a classroom."""
        classroom_id = request.data.get('classroom_id')

        if not classroom_id:
            return Response(
                {'error': 'classroom_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        student = Student.objects.filter(user=request.user).first()
        if not student:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        classroom = get_object_or_404(Classroom, id=classroom_id)
        if classroom not in student.classrooms.all():
            return Response(
                {'error': 'You are not enrolled in this classroom'},
                status=status.HTTP_400_BAD_REQUEST
            )

        student.classrooms.remove(classroom)

        # Cleanup enrollment request rows to allow future re-join requests
        EnrollmentRequest.objects.filter(student=student, classroom=classroom).delete()

        return Response(
            {'message': f'You have left classroom {classroom.name} successfully.'},
            status=status.HTTP_200_OK
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        classroom = instance.classrooms.first()
        if classroom and classroom.teacher != self.request.user:
            return Response(
                {"error": "You are not authorized to delete this student."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        PaperSubmission.objects.filter(student=instance).delete()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# Enrollment Request Views (Student -> Teacher)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_classrooms_list(request):
    """List all classrooms for students to browse"""
    classrooms = Classroom.objects.select_related('teacher').all()
    
    # Get student info to annotate enrollment status
    student = Student.objects.filter(user=request.user).first()
    
    serializer = AllClassroomSerializer(classrooms, many=True)
    data = serializer.data
    
    if student:
        enrolled_ids = set(student.classrooms.values_list('id', flat=True))
        pending_ids = set(
            EnrollmentRequest.objects.filter(
                student=student, status='pending', request_type='student_request'
            ).values_list('classroom_id', flat=True)
        )
        rejected_ids = set(
            EnrollmentRequest.objects.filter(
                student=student, status='rejected', request_type='student_request'
            ).values_list('classroom_id', flat=True)
        )
        
        for item in data:
            cid = item['id']
            if cid in enrolled_ids:
                item['enrollment_status'] = 'joined'
            elif cid in pending_ids:
                item['enrollment_status'] = 'pending'
            elif cid in rejected_ids:
                item['enrollment_status'] = 'rejected'
            else:
                item['enrollment_status'] = None
    else:
        for item in data:
            item['enrollment_status'] = None
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_enrollment_request(request):
    """Student requests to join a classroom"""
    classroom_id = request.data.get('classroom_id')
    
    if not classroom_id:
        return Response(
            {'error': 'classroom_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response(
            {'error': 'Student profile not found. Please register as a student first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    classroom = get_object_or_404(Classroom, id=classroom_id)
    
    # Check if already a member
    if classroom in student.classrooms.all():
        return Response(
            {'error': 'You are already a member of this classroom.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check for existing pending request
    existing = EnrollmentRequest.objects.filter(
        student=student, classroom=classroom, request_type='student_request'
    ).first()
    
    if existing:
        if existing.status == 'pending':
            return Response(
                {'error': 'You already have a pending request for this classroom.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif existing.status in ['rejected', 'approved']:
            # Allow re-request after rejection or after leaving a previously approved class
            existing.status = 'pending'
            existing.save()
            serializer = EnrollmentRequestSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

    try:
        enrollment_request = EnrollmentRequest.objects.create(
            student=student,
            classroom=classroom,
            status='pending',
            request_type='student_request'
        )
    except IntegrityError:
        # Safety net for race conditions / stale unique row
        existing = EnrollmentRequest.objects.filter(
            student=student,
            classroom=classroom,
            request_type='student_request'
        ).first()
        if existing:
            if existing.status != 'pending':
                existing.status = 'pending'
                existing.save(update_fields=['status', 'updated_at'])
            serializer = EnrollmentRequestSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        raise
    
    serializer = EnrollmentRequestSerializer(enrollment_request)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enrollment_requests(request, classroom_id):
    """Teacher gets pending enrollment requests for their classroom"""
    classroom = get_object_or_404(Classroom, id=classroom_id)
    
    if classroom.teacher != request.user:
        return Response(
            {'error': 'You are not authorized to view requests for this classroom.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    status_filter = request.query_params.get('status', 'pending')
    requests_qs = EnrollmentRequest.objects.filter(
        classroom=classroom, status=status_filter, request_type='student_request'
    ).select_related('student', 'student__user')
    
    serializer = EnrollmentRequestSerializer(requests_qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def handle_enrollment_request(request, request_id):
    """Teacher approves or rejects an enrollment request"""
    enrollment_request = get_object_or_404(EnrollmentRequest, id=request_id)
    classroom = enrollment_request.classroom
    
    if classroom.teacher != request.user:
        return Response(
            {'error': 'You are not authorized to handle this request.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    action_serializer = EnrollmentRequestActionSerializer(data=request.data)
    action_serializer.is_valid(raise_exception=True)
    
    action = action_serializer.validated_data['action']
    
    if action == 'approve':
        enrollment_request.status = 'approved'
        enrollment_request.save()
        # Add student to classroom
        enrollment_request.student.classrooms.add(classroom)
        return Response({
            'message': f'Student {enrollment_request.student.name} has been approved.',
            'status': 'approved'
        }, status=status.HTTP_200_OK)
    
    elif action == 'reject':
        enrollment_request.status = 'rejected'
        enrollment_request.save()
        return Response({
            'message': f'Student {enrollment_request.student.name} has been rejected.',
            'status': 'rejected'
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_enrolled_classrooms(request):
    """Get classrooms the current student is enrolled in"""
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response(
            {'error': 'Student profile not found.', 'classrooms': []},
            status=status.HTTP_200_OK
        )
    
    classrooms = student.classrooms.select_related('teacher').all()
    data = []
    for classroom in classrooms:
        teacher_info = None
        if classroom.teacher:
            teacher_info = {
                'name': classroom.teacher.username,
                'email': classroom.teacher.email or 'N/A',
                'avatar': classroom.teacher.avatar.url if classroom.teacher.avatar else None,
            }
        data.append({
            'id': classroom.id,
            'name': classroom.name,
            'description': classroom.description,
            'teacher': teacher_info,
            'total_students': classroom.students.count(),
        })
    
    return Response({
        'student': {
            'id': student.id,
            'name': student.name,
            'student_id': student.student_id,
        },
        'classrooms': data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enrollment_requests_count(request, classroom_id):
    """Get count of pending enrollment requests for a classroom"""
    classroom = get_object_or_404(Classroom, id=classroom_id)
    
    if classroom.teacher != request.user:
        return Response(
            {'error': 'Forbidden'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    count = EnrollmentRequest.objects.filter(
        classroom=classroom, status='pending', request_type='student_request'
    ).count()
    
    return Response({'count': count}, status=status.HTTP_200_OK)


# ============================================
# Teacher Invitation Views (Teacher -> Student)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_student(request, classroom_id):
    """Teacher invites a student to join their classroom by email"""
    classroom = get_object_or_404(Classroom, id=classroom_id)
    
    if classroom.teacher != request.user:
        return Response(
            {'error': 'You are not authorized to invite students to this classroom.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response(
            {'error': 'Email is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Find student by email
    student = Student.objects.filter(user__email__iexact=email).select_related('user').first()
    if not student:
        return Response(
            {'error': f'No student account found with email "{email}". The student must register first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if already a member
    if classroom in student.classrooms.all():
        return Response(
            {'error': f'{student.name} is already a member of this classroom.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check for existing invitation
    existing = EnrollmentRequest.objects.filter(
        student=student, classroom=classroom, request_type='teacher_invitation'
    ).first()
    
    if existing:
        if existing.status == 'pending':
            return Response(
                {'error': f'An invitation is already pending for {student.name}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif existing.status in ['rejected', 'approved']:
            # Allow re-invitation
            existing.status = 'pending'
            existing.invited_by = request.user
            existing.save()
            return Response({
                'message': f'Invitation re-sent to {student.name} ({email}).',
            }, status=status.HTTP_200_OK)
    
    try:
        EnrollmentRequest.objects.create(
            student=student,
            classroom=classroom,
            status='pending',
            request_type='teacher_invitation',
            invited_by=request.user
        )
    except IntegrityError:
        return Response(
            {'error': 'An invitation already exists for this student.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return Response({
        'message': f'Invitation sent to {student.name} ({email}).',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_invitations(request):
    """Student fetches their pending teacher invitations"""
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response([], status=status.HTTP_200_OK)
    
    invitations = EnrollmentRequest.objects.filter(
        student=student,
        request_type='teacher_invitation',
        status='pending'
    ).select_related('classroom', 'classroom__teacher', 'invited_by')
    
    serializer = InvitationSerializer(invitations, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_invitations_count(request):
    """Get count of pending teacher invitations for a student"""
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response({'count': 0}, status=status.HTTP_200_OK)
    
    count = EnrollmentRequest.objects.filter(
        student=student,
        request_type='teacher_invitation',
        status='pending'
    ).count()
    
    return Response({'count': count}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def handle_invitation(request, invitation_id):
    """Student accepts or rejects a teacher invitation"""
    invitation = get_object_or_404(EnrollmentRequest, id=invitation_id, request_type='teacher_invitation')
    
    # Verify the invitation belongs to the current student
    student = Student.objects.filter(user=request.user).first()
    if not student or invitation.student != student:
        return Response(
            {'error': 'You are not authorized to handle this invitation.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    action_serializer = EnrollmentRequestActionSerializer(data=request.data)
    action_serializer.is_valid(raise_exception=True)
    
    action = action_serializer.validated_data['action']
    
    if action == 'approve':
        invitation.status = 'approved'
        invitation.save()
        # Add student to classroom
        student.classrooms.add(invitation.classroom)
        return Response({
            'message': f'You have joined {invitation.classroom.name}.',
            'status': 'approved'
        }, status=status.HTTP_200_OK)
    
    elif action == 'reject':
        invitation.status = 'rejected'
        invitation.save()
        return Response({
            'message': f'You have declined the invitation to {invitation.classroom.name}.',
            'status': 'rejected'
        }, status=status.HTTP_200_OK)