from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
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
        return Subject.objects.filter(created_by=self.request.user).prefetch_related('chapters')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def chapters(self, request, pk=None):
        """Lấy danh sách chương của môn học"""
        subject = self.get_object()
        chapters = subject.chapters.all().prefetch_related('sections')
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
        
        return queryset.select_related('subject').prefetch_related('sections')
    
    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        """Lấy danh sách mục của chương"""
        chapter = self.get_object()
        sections = chapter.sections.all().prefetch_related('questions')
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
        
        return queryset.select_related('chapter__subject')
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Lấy danh sách câu hỏi của mục"""
        section = self.get_object()
        questions = section.questions.filter(is_active=True).prefetch_related('options')
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
        """Upload file Word chứa câu hỏi"""
        print(f"[upload_questions] Starting upload from {request.user}")
        
        file = request.FILES.get('file')
        section_id = request.data.get('section_id')
        
        print(f"[upload_questions] File: {file}, Section ID: {section_id}")
        
        # Validation
        if not file:
            return Response(
                {"error": "File is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not file.name.endswith('.docx'):
            return Response(
                {"error": "File must be .docx format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not section_id:
            return Response(
                {"error": "section_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check section exists and belongs to user
        try:
            section = Section.objects.select_related('chapter__subject').get(
                id=section_id,
                chapter__subject__created_by=request.user
            )
            print(f"[upload_questions] Section found: {section.name}")
        except Section.DoesNotExist:
            return Response(
                {"error": "Section not found or you don't have permission"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, 'uploaded_questions.docx')
        
        try:
            # Save uploaded file
            with open(temp_file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            print(f"[upload_questions] File saved to: {temp_file_path}")
            print(f"[upload_questions] File exists: {os.path.exists(temp_file_path)}")
            print(f"[upload_questions] File size: {os.path.getsize(temp_file_path)} bytes")
            
            # Process immediately (synchronously for debugging)
            result = process_word_document(temp_file_path, section, request.user)
            
            print(f"[upload_questions] Upload result: {result}")
            
            # Cleanup
            try:
                shutil.rmtree(temp_dir)
                print(f"[upload_questions] Temp directory deleted")
            except Exception as e:
                print(f"[upload_questions] Error deleting temp dir: {e}")
            
            if result['success']:
                return Response(
                    {
                        "message": f"Successfully created {result['created_count']} questions",
                        "section_id": section_id,
                        "section_name": section.name,
                        "language": result['language'],
                        "created_count": result['created_count'],
                        "errors": result['errors']
                    }, 
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {
                        "error": "Failed to process questions",
                        "details": result['errors']
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            # Cleanup on error
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
            
            print(f"[upload_questions] Critical error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response(
                {"error": f"Critical error: {str(e)}"}, 
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
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Soft delete câu hỏi"""
        question = self.get_object()
        question.is_active = False
        question.save()
        return Response(
            {"message": "Question deleted"},
            status=status.HTTP_204_NO_CONTENT
        )