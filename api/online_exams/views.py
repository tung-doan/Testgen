from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Avg
from .models import Exam, ExamAttempt, ExamQuestion
from .serializers import (
    ExamSerializer, ExamCreateUpdateSerializer, ExamDetailForAttemptSerializer,
    ExamAttemptSerializer, ExamAttemptCreateSerializer, 
    ExamAttemptSubmitSerializer, ExamAttemptResultSerializer,
    ExamQuestionDetailSerializer, ExamAttemptListSerializer
)
from classrooms.models import Student
from django.db import transaction

class ExamViewSet(viewsets.ModelViewSet):
    """API for Teachers: Create, Edit, Delete Exams"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Exam.objects.filter(created_by=self.request.user).prefetch_related(
            'examquestion_set__question__options',
            'classroom'
        )
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExamCreateUpdateSerializer
        return ExamSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get list of exam questions"""
        exam = self.get_object()
        exam_questions = exam.examquestion_set.all().select_related('question').prefetch_related('question__options')
        serializer = ExamQuestionDetailSerializer(exam_questions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic  # Ensure integrity, rollback on error
    def update_questions(self, request, pk=None):
        exam = self.get_object()
        
        if exam.attempts.exists():
             return Response(
                {"error": "Cannot modify questions because students have already attempted this exam."},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions_data = request.data.get('questions', [])
        
        # New question IDs sent
        new_question_ids = [item['question_id'] for item in questions_data]
        
        # Existing question IDs in DB
        current_exam_questions = ExamQuestion.objects.filter(exam=exam)
        current_map = {eq.question_id: eq for eq in current_exam_questions}
        
        # A. IDENTIFY QUESTIONS TO DELETE (In DB but not in new list)
        ids_to_keep = set(new_question_ids)
        ExamQuestion.objects.filter(exam=exam).exclude(question_id__in=ids_to_keep).delete()
        
        # B. IDENTIFY QUESTIONS TO CREATE OR UPDATE
        to_create = []
        to_update = []
        
        from question_bank.models import Question
        # Query once to get default points info if needed
        all_questions_info = {q.id: q for q in Question.objects.filter(id__in=new_question_ids)}

        for item in questions_data:
            q_id = item['question_id']
            base_question = all_questions_info.get(q_id)
            if not base_question: continue

            new_points = float(item.get('points', 1.0))
            new_order = item['order']

            if q_id in current_map:
                # EXISTING QUESTION -> UPDATE
                existing_record = current_map[q_id]
                # Only update if changed to save query
                if existing_record.points != new_points or existing_record.order != new_order:
                    existing_record.points = new_points
                    existing_record.order = new_order
                    to_update.append(existing_record)
            else:
                # NEW QUESTION -> CREATE
                to_create.append(ExamQuestion(
                    exam=exam,
                    question=base_question,
                    order=new_order,
                    points=new_points
                ))

        # Execute DB commands
        if to_create:
            ExamQuestion.objects.bulk_create(to_create)
        
        if to_update:
            ExamQuestion.objects.bulk_update(to_update, ['points', 'order'])

        return Response({"message": "Questions updated successfully"})

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """Get all attempts for an exam - used by teachers to view submissions"""
        exam = self.get_object()
        attempts = ExamAttempt.objects.filter(
            exam=exam
        ).select_related(
            'student', 'student__user'
        ).order_by('student__name', '-start_time')
        serializer = ExamAttemptListSerializer(attempts, many=True)
        return Response(serializer.data)

class ExamAttemptViewSet(viewsets.ModelViewSet):
    """API for Students: Take exams and view results"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ExamAttempt.objects.select_related(
            'exam', 'student', 'student__user'
        ).prefetch_related(
            'student__classrooms',
            'answers__question__options'
        )
        
        user = self.request.user
        
        # If student, only see own attempts
        if hasattr(user, 'student_profile'):
            queryset = queryset.filter(student=user.student_profile)
        # If teacher, see attempts for exams they created
        else:
            queryset = queryset.filter(exam__created_by=user)
            
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'start_exam':
            return ExamAttemptCreateSerializer
        elif self.action == 'submit_exam':
            return ExamAttemptSubmitSerializer
        elif self.action == 'retrieve':
            return ExamAttemptSerializer
        return ExamAttemptResultSerializer
    
    @action(detail=False, methods=['get'], url_path='pending-exams')
    def pending_exams(self, request):
        """Get list of pending exams for student"""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response(
                {"error": "student_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {"error": f"Student with id {student_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all exams for the classroom
        available_exams = Exam.objects.filter(
            classroom__in=student.classrooms.all()
        ).prefetch_related('examquestion_set').distinct()
        
        # Filter pending exams
        pending_exams = []
        for exam in available_exams:
            attempts_made = ExamAttempt.objects.filter(
                exam=exam,
                student=student
            ).count()
            
            if attempts_made < exam.max_attempts:
                pending_exams.append({
                    'id': exam.id,
                    'title': exam.title,
                    'description': exam.description or '',
                    'duration_minutes': exam.duration_minutes,
                    'max_attempts': exam.max_attempts,
                    'total_questions': exam.examquestion_set.count(),
                    'total_points': sum(eq.points for eq in exam.examquestion_set.all()),
                    'created_at': exam.created_at.isoformat(),
                    'show_results_immediately': exam.show_results_immediately,
                    'attempts_made': attempts_made
                })
        return Response(pending_exams)
    
    @action(detail=False, methods=['post'], url_path='start-exam')
    def start_exam(self, request):
        """Start taking an exam"""
        exam_id = request.data.get('exam_id')
        student_id = request.data.get('student_id')
        
        if not exam_id or not student_id:
            return Response(
                {"error": "exam_id and student_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        exam = get_object_or_404(Exam, id=exam_id)
        student = get_object_or_404(Student, id=student_id)
        
        if exam.classroom and exam.classroom not in student.classrooms.all():
            return Response(
                {"error": "You are not enrolled in this exam's classroom"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check number of attempts
        attempts_count = ExamAttempt.objects.filter(
            exam=exam,
            student=student
        ).count()
        
        if attempts_count >= exam.max_attempts:
            return Response(
                {"error": "Maximum attempts reached"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new attempt
        serializer = ExamAttemptCreateSerializer(data={
            'exam': exam_id,
            'student': student_id
        })
        
        if serializer.is_valid():
            attempt = serializer.save()
            response_serializer = ExamAttemptSerializer(attempt)
            return Response({
                'attempt_id': attempt.id,
                **response_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='submit-exam')
    def submit_exam(self, request, pk=None):
        """Submit exam"""
        attempt = self.get_object()
        
        if attempt.status == 'COMPLETED':
            return Response(
                {"error": "This exam has already been submitted"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExamAttemptSubmitSerializer(data=request.data)
        
        if serializer.is_valid():
            attempt = serializer.save(attempt=attempt)
            result_serializer = ExamAttemptResultSerializer(attempt)
            return Response(result_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)