from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .models import Classroom, Student
from .serializers import ClassroomSerializer, ClassroomCreateSerializer, StudentSerializer
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
        # Lấy danh sách sinh viên thuộc lớp
        students = Student.objects.filter(classroom=classroom)
        students_data = []

        # Lấy bài nộp của từng sinh viên
        for student in students:
            submission = PaperSubmission.objects.filter(student=student).first()
            if submission:
                student.submission = submission
            students_data.append(student)

        serializer = StudentSerializer(students_data, many=True)
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
        
        # Validate integer
        try:
            student_pk = int(student_pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'student_id must be a valid integer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            requesting_student = Student.objects.select_related('classroom__teacher', 'user').get(id=student_pk)
        except Student.DoesNotExist:
            return Response(
                {'error': f'Student with id {student_pk} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        classroom = requesting_student.classroom
        if not classroom:
            return Response(
                {'error': 'Student is not assigned to any classroom'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        classmates = Student.objects.filter(classroom=classroom).select_related('user').order_by('name')
        
        classmates_data = []
        for student in classmates:
            date_of_birth = None
            if student.user and hasattr(student.user, 'date_of_birth'):
                date_of_birth = student.user.date_of_birth
            
            classmates_data.append({
                'id': student.id,
                'name': student.name,
                'student_id': student.student_id,
                'date_of_birth': date_of_birth,  
                'average_score': student.average_score,
            })
        
        # Get teacher info
        teacher_info = None
        if classroom.teacher:
            teacher_info = {
                'name': classroom.teacher.username,
                'email': classroom.teacher.email or 'N/A',
            }
        
        enrollment_date = requesting_student.created_at
        
        return Response({
            'id': classroom.id,
            'name': classroom.name,
            'description': classroom.description,
            'teacher': teacher_info,
            'total_students': classmates.count(),
            'classmates': classmates_data,
            'enrollment_date': enrollment_date,
            'created_at': classroom.created_at,
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
        return Student.objects.filter(classroom__teacher=self.request.user)

    def perform_create(self, serializer):
        classroom_id = self.request.data.get('classroom')
        if not classroom_id:
            raise serializers.ValidationError({"classroom": "Classroom ID is required."})
        
        classroom = get_object_or_404(Classroom, id=classroom_id)
        if classroom.teacher != self.request.user:
            raise serializers.ValidationError({"classroom": "You are not authorized to add students to this class."})
        
        # Kiểm tra dữ liệu đầu vào
        name = self.request.data.get('name')
        student_id = self.request.data.get('student_id')
        password = self.request.data.get('password')
        
        if not name or not student_id:
            raise serializers.ValidationError({
                "name": "Name is required." if not name else None,
                "student_id": "Student ID is required." if not student_id else None
            })
            
        if not password:
            raise serializers.ValidationError({
                "password": "Password is required when creating a student."
            })
        
        if len(password) < 6:
            raise serializers.ValidationError({
                "password": "Password must be at least 6 characters long."
            })
        
        serializer.save(classroom=classroom)
        
        def destroy(self, request, *args, **kwargs):
            instance = self.get_object()
            classroom = instance.classroom
            if classroom.teacher != self.request.user:
                return Response({"error": "You are not authorized to delete this student."}, status=status.HTTP_403_FORBIDDEN)
            
            # Xóa các bài nộp liên quan trước khi xóa sinh viên
            PaperSubmission.objects.filter(student=instance).delete()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)