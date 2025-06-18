from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .models import Classroom, Student
from .serializers import ClassroomSerializer, ClassroomCreateSerializer, StudentSerializer
from exam.models import Submission
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
            submission = Submission.objects.filter(student=student).first()
            if submission:
                student.submission = submission
            students_data.append(student)

        serializer = StudentSerializer(students_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        if not name or not student_id:
            raise serializers.ValidationError({
                "name": "Name is required." if not name else None,
                "student_id": "Student ID is required." if not student_id else None
            })
        
        serializer.save(classroom=classroom)
        
        def destroy(self, request, *args, **kwargs):
            instance = self.get_object()
            classroom = instance.classroom
            if classroom.teacher != self.request.user:
                return Response({"error": "You are not authorized to delete this student."}, status=status.HTTP_403_FORBIDDEN)
            
            # Xóa các bài nộp liên quan trước khi xóa sinh viên
            Submission.objects.filter(student=instance).delete()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)