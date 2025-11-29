# online_exams/views.py
from rest_framework import viewsets, permissions
from .models import Exam, ExamAttempt
from .serializers import ExamSerializer, ExamAttemptSerializer

class ExamViewSet(viewsets.ModelViewSet):
    """
    API cho Giáo viên: Tạo, Sửa, Xóa Đề thi (khung đề).
    """
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    # TODO: Cần set permission chỉ cho giáo viên
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Chỉ cho giáo viên xem các đề thi họ tạo ra
        return Exam.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ExamAttemptViewSet(viewsets.ModelViewSet):
    """
    API cho Học sinh:
    - POST (create): Nộp bài thi
    - GET (list, retrieve): Xem lại các bài đã nộp (nếu được phép)
    """
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Học sinh chỉ được xem bài của mình
        # TODO: Cần liên kết request.user với Student
        # student = get_object_or_404(Student, user=self.request.user)
        # return ExamAttempt.objects.filter(student=student)
        return ExamAttempt.objects.none() # Tạm thời
    
    # TODO: Cần thêm các @action cho học sinh như:
    # - @action(detail=True, methods=['get'], url_path='start')
    #   def start_exam(self, request, pk=None):
    #       # Tạo ExamAttempt với status='IN_PROGRESS'
    #       # Trả về danh sách câu hỏi và thời gian bắt đầu
    #
    # - @action(detail=True, methods=['post'], url_path='finish')
    #   def finish_exam(self, request, pk=None):
    #       # Tính điểm, đổi status='COMPLETED'