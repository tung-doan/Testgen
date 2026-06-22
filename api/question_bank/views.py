from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch, Count
from .models import Subject, Chapter, Section, Question, AnswerOption
from .serializers import (
    SubjectSerializer, ChapterSerializer, 
    SectionSerializer, QuestionSerializer,
    QuestionCreateSerializer, QuestionDetailSerializer
)
from .word_processor import process_word_document
import os
import tempfile
import shutil

class SubjectViewSet(viewsets.ModelViewSet):
    """CRUD cho Môn học"""
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Subject.objects.filter(created_by=self.request.user).annotate(
            chapter_count=Count('chapters', distinct=True)
        )
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def chapters(self, request, pk=None):
        """Lấy danh sách chương của môn học"""
        subject = self.get_object()
        chapters = subject.chapters.all().select_related('subject').annotate(
            section_count=Count('sections', distinct=True)
        )
        serializer = ChapterSerializer(chapters, many=True)
        return Response(serializer.data)


class ChapterViewSet(viewsets.ModelViewSet):
    """CRUD cho Chương"""
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Chapter.objects.filter(subject__created_by=self.request.user)
        
        subject_id = self.request.query_params.get('subject_id')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        return queryset.select_related('subject').annotate(
            section_count=Count('sections', distinct=True)
        )
    
    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        """Lấy danh sách mục của chương"""
        chapter = self.get_object()
        sections = chapter.sections.all().select_related('chapter__subject').annotate(
            question_count=Count('questions', filter=Q(questions__is_active=True))
        )
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)


class SectionViewSet(viewsets.ModelViewSet):
    """CRUD cho Mục"""
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Section.objects.filter(chapter__subject__created_by=self.request.user)
        
        chapter_id = self.request.query_params.get('chapter_id')
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        
        return queryset.select_related('chapter__subject').annotate(
            question_count=Count('questions', filter=Q(questions__is_active=True))
        )
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Lấy danh sách câu hỏi của mục"""
        section = self.get_object()
        questions = section.questions.filter(is_active=True).prefetch_related('options')
        serializer = QuestionDetailSerializer(questions, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['get'])
    def deleted_questions(self, request, pk=None):
        """Lấy danh sách câu hỏi đã xóa (is_active=False) của mục"""
        section = self.get_object()
        questions = section.questions.filter(is_active=False).prefetch_related('options')
        serializer = QuestionDetailSerializer(questions, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """CRUD và Upload câu hỏi"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionCreateSerializer
        elif self.action == 'retrieve':
            return QuestionDetailSerializer
        return QuestionSerializer
    
    def get_queryset(self):
        queryset = Question.objects.filter(
            section__chapter__subject__created_by=self.request.user,
            is_active=True
        ).select_related('section__chapter__subject', 'created_by')
        
        # Advanced filtering
        section_id = self.request.query_params.get('section_id')
        chapter_id = self.request.query_params.get('chapter_id')
        subject_id = self.request.query_params.get('subject_id')
        question_type = self.request.query_params.get('question_type')
        search = self.request.query_params.get('search')
        
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if chapter_id:
            queryset = queryset.filter(section__chapter_id=chapter_id)
        if subject_id:
            queryset = queryset.filter(section__chapter__subject_id=subject_id)
        if question_type:
            queryset = queryset.filter(question_type=question_type)
        if search:
            queryset = queryset.filter(
                Q(prompt__icontains=search)
            )
        
        return queryset.prefetch_related('options')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='upload-questions')
    def upload_questions(self, request):
        """Upload file Word chứa câu hỏi - with comprehensive validation"""
        import zipfile
        
        file = request.FILES.get('file')
        section_id = request.data.get('section_id')
        
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        
        # ── File validation ──
        if not file:
            return Response(
                {"error": "File is required", "error_type": "no_file"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file.size == 0:
            return Response(
                {"error": "File is empty (0 bytes)", "error_type": "empty_file"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file.size > MAX_FILE_SIZE:
            size_mb = round(file.size / (1024 * 1024), 1)
            return Response(
                {
                    "error": f"File size ({size_mb}MB) exceeds the {MAX_FILE_SIZE // (1024*1024)}MB limit",
                    "error_type": "file_too_large"
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not file.name.endswith('.docx'):
            return Response(
                {
                    "error": f"Invalid file format: '{file.name}'. Only .docx files are accepted",
                    "error_type": "invalid_format"
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify actual file content is a valid ZIP (docx = ZIP with XML)
        file.seek(0)
        if not zipfile.is_zipfile(file):
            file.seek(0)
            return Response(
                {
                    "error": "File content is not a valid .docx document. "
                             "The file may be corrupted or is not a real Word document",
                    "error_type": "invalid_content"
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        file.seek(0)
        
        if not section_id:
            return Response(
                {"error": "section_id is required", "error_type": "missing_section"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ── Section validation ──
        try:
            section = Section.objects.select_related('chapter__subject').get(
                id=section_id,
                chapter__subject__created_by=request.user
            )
        except Section.DoesNotExist:
            return Response(
                {"error": "Section not found or you don't have permission", "error_type": "section_not_found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ── Process file ──
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, 'uploaded_questions.docx')
        
        try:
            with open(temp_file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            result = process_word_document(temp_file_path, section, request.user)
            
            # Cleanup
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
            
            # ── Build response ──
            if result['success']:
                message = f"Successfully created {result['created_count']} question(s)"
                if result['skipped_count'] > 0:
                    message += f", skipped {result['skipped_count']} duplicate(s)"
                if result['validation_errors']:
                    message += f", {len(result['validation_errors'])} question(s) had errors"
                
                return Response(
                    {
                        "message": message,
                        "section_id": section_id,
                        "section_name": section.name,
                        "language": result['language'],
                        "created_count": result['created_count'],
                        "skipped_count": result.get('skipped_count', 0),
                        "skipped_duplicates": result.get('skipped_duplicates', []),
                        "validation_errors": result.get('validation_errors', []),
                        "errors": result.get('errors', []),
                    }, 
                    status=status.HTTP_201_CREATED
                )
            else:
                # All questions failed
                all_errors = result.get('validation_errors', []) + result.get('errors', [])
                error_messages = [e['message'] for e in all_errors] if all_errors else ["Failed to process questions"]
                
                return Response(
                    {
                        "error": "Failed to process questions",
                        "error_type": "processing_failed",
                        "details": error_messages,
                        "validation_errors": result.get('validation_errors', []),
                        "errors": result.get('errors', []),
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
            
            print(f"[upload_questions] Critical error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response(
                {
                    "error": f"Critical error processing file: {str(e)}",
                    "error_type": "critical"
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='by-type')
    def by_type(self, request):
        """Lấy câu hỏi theo loại"""
        question_type = request.query_params.get('type')
        if not question_type:
            return Response(
                {"error": "Parameter 'type' is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        questions = self.get_queryset().filter(question_type=question_type)
        serializer = self.get_serializer(questions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Nhân bản câu hỏi"""
        original_question = self.get_object()
        
        # Duplicate question
        new_question = Question.objects.create(
            section=original_question.section,
            created_by=request.user,
            question_type=original_question.question_type,
            prompt=f"[Copy] {original_question.prompt}",
            points=original_question.points
        )
        
        # Duplicate options
        original_options = original_question.options.all()
        new_options = []
        for opt in original_options:
            new_options.append(
                AnswerOption(
                    question=new_question,
                    text=opt.text,
                    score_percentage=opt.score_percentage,
                    is_correct_bool=opt.is_correct_bool,
                    correct_order=opt.correct_order,
                    order=opt.order
                )
            )
        
        AnswerOption.objects.bulk_create(new_options)
        
        serializer = QuestionDetailSerializer(new_question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if question is used in exams
        exams = instance.exams.all()
        published_exams = exams.filter(is_published=True)
        
        if published_exams.exists():
            exam_titles = ", ".join([e.title for e in published_exams])
            return Response(
                {"error": f"This question is currently used in the published exam '{exam_titles}'. Please close the exam before deleting this question."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        scheduled_exams = exams.filter(is_published=False)
        if scheduled_exams.exists() and request.query_params.get('force') != 'true':
            exam_titles = ", ".join([e.title for e in scheduled_exams])
            return Response(
                {"error": f"This question is currently used in the scheduled exam '{exam_titles}'. Are you sure you want to continue? The question will be removed from this exam."},
                status=status.HTTP_409_CONFLICT
            )
            
        # If force=true, remove from ExamQuestion
        if scheduled_exams.exists() and request.query_params.get('force') == 'true':
            from online_exams.models import ExamQuestion
            ExamQuestion.objects.filter(question=instance).delete()
            
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        """Soft delete instead of standard database delete"""
        instance.is_active = False
        instance.save()
    
    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """Bulk soft delete nhiều câu hỏi cùng lúc"""
        question_ids = request.data.get('question_ids', [])
        force = request.data.get('force', False)
        
        if not question_ids:
            return Response(
                {"error": "question_ids is required and must be a non-empty array"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(question_ids, list):
            return Response(
                {"error": "question_ids must be an array"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all questions that belong to user (prefetch exams to avoid N+1)
        questions = Question.objects.filter(
            section__chapter__subject__created_by=request.user,
            id__in=question_ids,
            is_active=True
        ).prefetch_related('exams')
        
        if not questions.exists():
            return Response(
                {"error": "No questions found to delete"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check for exams
        published_exams = set()
        scheduled_exams = set()
        for q in questions:
            for exam in q.exams.all():
                if exam.is_published:
                    published_exams.add(exam.title)
                else:
                    scheduled_exams.add(exam.title)
                    
        if published_exams:
            titles = ", ".join(published_exams)
            return Response(
                {"error": f"Some questions are used in published exams ({titles}). Please close these exams before deleting."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if scheduled_exams and str(force).lower() != 'true':
            titles = ", ".join(scheduled_exams)
            return Response(
                {"error": f"Some questions are used in scheduled exams ({titles}). Are you sure you want to continue? The questions will be removed from these exams."},
                status=status.HTTP_409_CONFLICT
            )
            
        if scheduled_exams and str(force).lower() == 'true':
            from online_exams.models import ExamQuestion
            ExamQuestion.objects.filter(question__in=questions).delete()
        
        deleted_count = questions.count()
        # Soft delete
        questions.update(is_active=False)
        
        return Response(
            {
                "message": f"Successfully deleted {deleted_count} question(s)",
                "deleted_count": deleted_count
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Khôi phục câu hỏi đã xóa"""
        try:
            # Bypass get_queryset() which filters is_active=True
            question = Question.objects.get(
                pk=pk, 
                section__chapter__subject__created_by=request.user,
                is_active=False
            )
            question.is_active = True
            question.save()
            return Response({"message": "Question restored successfully"}, status=status.HTTP_200_OK)
        except Question.DoesNotExist:
            return Response(
                {"error": "Question not found or already active"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        """Xóa vĩnh viễn câu hỏi đã nằm trong thùng rác"""
        try:
            question = Question.objects.get(
                pk=pk, 
                section__chapter__subject__created_by=request.user,
                is_active=False
            )
            question.delete()
            return Response({"message": "Question permanently deleted"}, status=status.HTTP_204_NO_CONTENT)
        except Question.DoesNotExist:
            return Response(
                {"error": "Question not found or not in trash"}, 
                status=status.HTTP_404_NOT_FOUND
            )