from rest_framework import viewsets, status
from textwrap import wrap
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q
from django.http import FileResponse
from io import BytesIO
import zipfile
import threading
import cloudinary
import random

from exam.models import (
    PaperTest, PaperTestQuestion, PaperTestVariant,
    PaperSubmission, PaperAnswerDetected, PaperUserAnswer
)
from exam.serializers import TestSerializer, TestCreateSerializer, SubmissionSerializer, PaperTestVariantSerializer
from classrooms.models import Student
from .omr_processing import process_submission_cloudinary
from .generate_omr_sheet import generate_omr_sheet


# ✅ ==================== SINGLE PDF GEN FUNCTION ====================
def generate_omr_pdf(title, variant_code, num_questions, num_choices, questions=None):
    """
    OMR Answer Sheet PDF Generator v2.1
    - Uses fixed template tiers (20/40/60/80/100)
    - Timing marks on left margin for Y-axis calibration
    - Block grouping (groups of 5 questions)
    """
    pdf_buf, _template = generate_omr_sheet(
        title=title,
        variant_code=variant_code,
        num_questions=num_questions,
        num_choices=num_choices,
        questions=questions,
    )
    return pdf_buf


class TestViewSet(viewsets.ModelViewSet):
    """✅ CRUD Paper Test + Download Variants + Preview PDF"""
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaperTest.objects.filter(created_by=self.request.user).prefetch_related(
            'paper_questions__question__options',
            'variants'
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TestCreateSerializer
        return TestSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='download-all-variants')
    def download_all_variants(self, request, pk=None):
        """Download ZIP containing all PDF variants (OMR + questions)"""
        test = self.get_object()
        variants = test.variants.all()

        if not variants.exists():
            return Response({"error": "No variants found"}, status=status.HTTP_404_NOT_FOUND)

        # Pre-load all questions for this test
        from question_bank.models import Question
        test_question_ids = list(test.paper_questions.values_list('question_id', flat=True))
        all_questions = {q.id: q for q in Question.objects.filter(id__in=test_question_ids).prefetch_related('options')}

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for variant in variants:
                # Build questions_data in variant order with shuffled options
                questions_data = self._build_variant_questions(variant, all_questions)

                pdf_buffer = generate_omr_pdf(
                    title=test.title,
                    variant_code=variant.variant_code,
                    num_questions=test.num_questions,
                    num_choices=test.num_choices,
                    questions=questions_data,
                )
                pdf_buffer.seek(0)
                filename = f"{test.title}_Variant_{variant.variant_code}.pdf"
                zip_file.writestr(filename, pdf_buffer.read())

        zip_buffer.seek(0)
        return FileResponse(zip_buffer, as_attachment=True,
                            filename=f'{test.title}_All_Variants.zip',
                            content_type='application/zip')

    @action(detail=True, methods=['get'], url_path='download-variant/(?P<variant_code>[^/.]+)')
    def download_variant(self, request, pk=None, variant_code=None):
        """Download PDF of 1 variant (OMR + questions)"""
        test = self.get_object()
        try:
            variant = test.variants.get(variant_code=variant_code)
        except PaperTestVariant.DoesNotExist:
            return Response({"error": f"Variant {variant_code} not found"}, status=status.HTTP_404_NOT_FOUND)

        # Build questions_data in variant order with shuffled options
        from question_bank.models import Question
        test_question_ids = list(test.paper_questions.values_list('question_id', flat=True))
        all_questions = {q.id: q for q in Question.objects.filter(id__in=test_question_ids).prefetch_related('options')}
        questions_data = self._build_variant_questions(variant, all_questions)

        pdf_buffer = generate_omr_pdf(
            title=test.title,
            variant_code=variant.variant_code,
            num_questions=test.num_questions,
            num_choices=test.num_choices,
            questions=questions_data,
        )
        pdf_buffer.seek(0)
        return FileResponse(pdf_buffer, as_attachment=True,
                            filename=f'{test.title}_Variant_{variant.variant_code}.pdf',
                            content_type='application/pdf')

    def _build_variant_questions(self, variant, all_questions):
        """Build question content list respecting variant's question order and answer shuffles"""
        questions_data = []
        for q_id in variant.question_order:
            q = all_questions.get(q_id)
            if not q:
                continue
            # Get original options sorted by order
            original_options = list(q.options.all().order_by('order'))
            # Get shuffle map for this question
            shuffle_map = variant.answer_shuffles.get(str(q_id), list(range(len(original_options))))
            # Reorder options according to shuffle
            shuffled_options = []
            for new_idx in shuffle_map:
                if new_idx < len(original_options):
                    shuffled_options.append({
                        'text': original_options[new_idx].text,
                        'order': len(shuffled_options),
                    })
            questions_data.append({
                'prompt': q.prompt,
                'options': shuffled_options,
            })
        return questions_data

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def generate_full_test_pdf(self, request):
        """Preview PDF with OMR sheet + question content"""
        try:
            from question_bank.models import Question

            title = request.data.get('title', 'DE KIEM TRA')
            num_choices = int(request.data.get('num_choices', 4))
            question_ids = request.data.get('questions', [])
            num_questions = len(question_ids)

            if num_choices < 1 or num_choices > 26:
                return Response({"error": "Number of choices must be 1-26"}, status=400)
            if num_questions < 1:
                return Response({"error": "At least 1 question required"}, status=400)

            variant_code = ''.join([str(random.randint(0, 9)) for _ in range(3)])

            # Fetch question content from database
            questions_data = []
            if question_ids:
                db_questions = Question.objects.filter(
                    id__in=question_ids
                ).prefetch_related('options').order_by('id')

                # Preserve order from question_ids
                q_map = {str(q.id): q for q in db_questions}
                for qid in question_ids:
                    q = q_map.get(str(qid))
                    if q:
                        options = [{'text': opt.text, 'order': opt.order}
                                   for opt in q.options.all().order_by('order')]
                        questions_data.append({
                            'prompt': q.prompt,
                            'options': options,
                        })

            pdf_buffer = generate_omr_pdf(
                title=title,
                variant_code=variant_code,
                num_questions=num_questions,
                num_choices=num_choices,
                questions=questions_data,
            )

            return FileResponse(pdf_buffer, as_attachment=False,
                                filename='preview_test.pdf',
                                content_type='application/pdf')

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def test_summary(self, request):
        """Get test summary"""
        tests = PaperTest.objects.filter(created_by=request.user).annotate(
            submission_count=Count('submissions', distinct=True),
            avg_score=Avg('submissions__total_score'),
            variant_count=Count('variants', distinct=True)
        )
        data = []
        for test in tests:
            data.append({
                'id': test.id,
                'title': test.title,
                'num_questions': test.num_questions,
                'num_choices': test.num_choices,
                'classroom': test.classroom.name if test.classroom else None,
                'submission_count': test.submission_count,
                'avg_score': round(test.avg_score, 2) if test.avg_score else 0,
                'created_at': test.created_at,
                'variant_count': test.variant_count,
            })
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def get_answer_keys(self, request, pk=None):
        """Get answer keys of a test"""
        test = self.get_object()
        paper_questions = PaperTestQuestion.objects.filter(test=test).select_related('question').order_by('order')
        if not paper_questions.exists():
            return Response({"error": "No questions found."}, status=status.HTTP_400_BAD_REQUEST)
        answer_keys = {}
        for pq in paper_questions:
            if pq.question:
                correct = pq.question.options.filter(is_correct_bool=True)
                answer_keys[str(pq.order)] = chr(65 + correct.first().order) if correct.exists() else ""
        return Response({"answer_keys": answer_keys}, status=status.HTTP_200_OK)


# ==================== STATISTICS ====================
class StatisticViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='test-statistics')
    def get_test_statistics(self, request):
        tests = PaperTest.objects.annotate(avg_score=Avg('submissions__total_score')) \
            .filter(submissions__total_score__isnull=False).order_by('id')
        data = [{'id': t.id, 'title': t.title,
                 'average_score': round(float(t.avg_score), 2) if t.avg_score else 0.0}
                for t in tests]
        return Response({'all_tests': data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='test-question-stats')
    def get_test_question_stats(self, request, pk=None):
        try:
            test = PaperTest.objects.get(id=pk)
            submissions = PaperSubmission.objects.filter(test=test)
            if not submissions.exists():
                return Response({'total_submissions': 0, 'average_score': 0,
                                 'average_correct_rate': 0, 'question_stats': [],
                                 'message': 'No submissions found'}, status=status.HTTP_200_OK)
            average_score = submissions.aggregate(avg_score=Avg('total_score'))['avg_score'] or 0
            question_stats = []
            for pq in PaperTestQuestion.objects.filter(test=test).order_by('order'):
                answers = PaperAnswerDetected.objects.filter(submission__test=test, question=pq)
                total = answers.count()
                correct = answers.filter(is_correct=True).count()
                question_stats.append({
                    'question_order': pq.order,
                    'question_prompt': pq.question.prompt if pq.question else "N/A",
                    'total_answers': total,
                    'correct_answers': correct,
                    'correct_rate': round(correct / total * 100, 2) if total > 0 else 0
                })
            avg_correct = sum(q['correct_rate'] for q in question_stats) / len(question_stats) if question_stats else 0
            return Response({'total_submissions': submissions.count(),
                             'average_score': round(average_score, 2),
                             'average_correct_rate': round(avg_correct, 2),
                             'question_stats': question_stats}, status=status.HTTP_200_OK)
        except PaperTest.DoesNotExist:
            return Response({"error": "Test not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        Aggregate dashboard statistics:
        1. class_averages: Average score per class (paper + online)
        2. test_averages: Average score per test (paper + online)
        3. top_students_by_class: Top 10 students by class (online only)
        """
        from online_exams.models import Exam, ExamAttempt
        from classrooms.models import Classroom

        user = request.user

        # ── 1. CLASS AVERAGES ──
        classrooms = Classroom.objects.filter(teacher=user)
        class_averages = []
        for classroom in classrooms:
            # Paper average
            paper_avg = PaperSubmission.objects.filter(
                test__classroom=classroom,
                test__created_by=user,
                total_score__isnull=False
            ).aggregate(avg=Avg('total_score'))['avg']

            # Online average
            online_avg = ExamAttempt.objects.filter(
                exam__classroom=classroom,
                exam__created_by=user,
                status='COMPLETED',
                final_score__isnull=False
            ).aggregate(avg=Avg('final_score'))['avg']

            class_averages.append({
                'class_id': classroom.id,
                'class_name': classroom.name,
                'avg_score_paper': round(float(paper_avg), 2) if paper_avg else None,
                'avg_score_online': round(float(online_avg), 2) if online_avg else None,
            })

        # ── 2. TEST AVERAGES (paper + online) ──
        test_averages = []

        # Paper tests
        paper_tests = PaperTest.objects.filter(created_by=user).annotate(
            avg_score=Avg('submissions__total_score'),
            sub_count=Count('submissions', distinct=True)
        )
        for t in paper_tests:
            test_averages.append({
                'id': t.id,
                'title': t.title,
                'type': 'paper',
                'average_score': round(float(t.avg_score), 2) if t.avg_score else 0,
                'submission_count': t.sub_count,
            })

        # Online exams
        online_exams = Exam.objects.filter(created_by=user).annotate(
            avg_score=Avg('attempts__final_score',
                          filter=Q(attempts__status='COMPLETED')),
            sub_count=Count('attempts',
                            filter=Q(attempts__status='COMPLETED'), distinct=True)
        )
        for e in online_exams:
            test_averages.append({
                'id': e.id,
                'title': e.title,
                'type': 'online',
                'average_score': round(float(e.avg_score), 2) if e.avg_score else 0,
                'submission_count': e.sub_count,
            })

        # ── 3. TOP STUDENTS BY CLASS (online only) ──
        top_students_by_class = {}
        for classroom in classrooms:
            completed_attempts = ExamAttempt.objects.filter(
                exam__classroom=classroom,
                exam__created_by=user,
                status='COMPLETED',
                final_score__isnull=False
            ).values(
                'student__id', 'student__name', 'student__student_id'
            ).annotate(
                avg_score=Avg('final_score'),
                attempts_count=Count('id')
            ).order_by('-avg_score')[:10]

            students_list = []
            for rank, entry in enumerate(completed_attempts, 1):
                students_list.append({
                    'rank': rank,
                    'id': entry['student__id'],
                    'name': entry['student__name'],
                    'student_id': entry['student__student_id'],
                    'avg_score': round(float(entry['avg_score']), 2),
                    'attempts_count': entry['attempts_count'],
                })

            top_students_by_class[str(classroom.id)] = {
                'class_name': classroom.name,
                'students': students_list,
            }

        return Response({
            'class_averages': class_averages,
            'test_averages': test_averages,
            'top_students_by_class': top_students_by_class,
        }, status=status.HTTP_200_OK)


# ==================== SUBMISSION ====================
class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaperSubmission.objects.filter(test__created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        submission = self.get_object()
        if submission.test.created_by != request.user:
            return Response({"error": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        if submission.submission_image:
            try:
                cloudinary.uploader.destroy(submission.submission_image.public_id)
            except Exception as e:
                print(f"Error deleting image: {e}")
        submission.delete()
        return Response({"message": "Deleted successfully!"}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def upload_submission(self, request):
        test_id = request.data.get('test_id')
        if not test_id:
            return Response({"error": "Test ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        test = get_object_or_404(PaperTest, id=test_id)
        if 'submission_image' not in request.FILES:
            return Response({"error": "Image is required"}, status=status.HTTP_400_BAD_REQUEST)
        # student_id is optional - MSSV will be auto-detected from OMR bubbles
        student = None
        student_id = request.data.get('student_id')
        if student_id:
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                pass

        submission = None
        try:
            upload_result = cloudinary.uploader.upload(request.FILES['submission_image'], folder="submissions")
            submission = PaperSubmission.objects.create(
                test=test, user=request.user, student=student,
                submission_image=upload_result['secure_url']
            )

            # ✅ Process synchronously — if error, we can rollback
            result = process_submission_cloudinary(submission.id, upload_result['secure_url'])

            return Response({
                "submission_id": submission.id,
                "message": "Graded successfully!",
                "detected_mssv": submission.detected_mssv or '',
                "variant_code": submission.variant.variant_code if submission.variant else '',
                "total_score": submission.total_score,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # On ANY error: delete submission from DB so no bad data is saved
            if submission:
                try:
                    submission.delete()
                except:
                    pass

            error_msg = str(e)

            # Classify error for frontend
            if "not found" in error_msg.lower() and "test id" in error_msg.lower():
                error_code = "VARIANT_NOT_FOUND"
            elif "cannot read digit" in error_msg.lower():
                error_code = "TEST_ID_UNREADABLE"
            elif "cannot read image" in error_msg.lower():
                error_code = "IMAGE_UNREADABLE"
            elif "corner marker" in error_msg.lower() or "paper contour" in error_msg.lower():
                error_code = "SCAN_MARKERS_NOT_FOUND"
            elif "template" in error_msg.lower():
                error_code = "TEMPLATE_ERROR"
            else:
                error_code = "PROCESSING_ERROR"

            return Response({
                "error": error_msg,
                "error_code": error_code,
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def upload_batch(self, request):
        """
        Upload and grade multiple OMR images at once.

        Accepts: test_id + multiple files in 'submission_images'.
        Each image is processed independently — if one fails, others still succeed.

        Returns: { results: [...], summary: { total, success, failed } }
        """
        test_id = request.data.get('test_id')
        if not test_id:
            return Response({"error": "Test ID is required", "error_code": "MISSING_TEST_ID"},
                            status=status.HTTP_400_BAD_REQUEST)
        test = get_object_or_404(PaperTest, id=test_id)

        files = request.FILES.getlist('submission_images')
        if not files:
            return Response({"error": "At least one image is required", "error_code": "NO_IMAGES"},
                            status=status.HTTP_400_BAD_REQUEST)

        results = []
        success_count = 0
        fail_count = 0

        for idx, file in enumerate(files):
            submission = None
            try:
                upload_result = cloudinary.uploader.upload(file, folder="submissions")
                submission = PaperSubmission.objects.create(
                    test=test, user=request.user,
                    submission_image=upload_result['secure_url']
                )

                process_submission_cloudinary(submission.id, upload_result['secure_url'])
                # Reload to get updated fields
                submission.refresh_from_db()

                results.append({
                    "index": idx,
                    "filename": file.name,
                    "status": "success",
                    "submission_id": submission.id,
                    "detected_mssv": submission.detected_mssv or '',
                    "variant_code": submission.variant.variant_code if submission.variant else '',
                    "total_score": submission.total_score,
                })
                success_count += 1

            except Exception as e:
                if submission:
                    try:
                        submission.delete()
                    except:
                        pass

                error_msg = str(e)
                if "not found" in error_msg.lower() and "test id" in error_msg.lower():
                    error_code = "VARIANT_NOT_FOUND"
                elif "cannot read digit" in error_msg.lower():
                    error_code = "TEST_ID_UNREADABLE"
                elif "cannot read image" in error_msg.lower():
                    error_code = "IMAGE_UNREADABLE"
                elif "corner marker" in error_msg.lower() or "paper contour" in error_msg.lower():
                    error_code = "SCAN_MARKERS_NOT_FOUND"
                elif "template" in error_msg.lower():
                    error_code = "TEMPLATE_ERROR"
                else:
                    error_code = "PROCESSING_ERROR"

                results.append({
                    "index": idx,
                    "filename": file.name,
                    "status": "failed",
                    "error": error_msg,
                    "error_code": error_code,
                })
                fail_count += 1

        return Response({
            "results": results,
            "summary": {
                "total": len(files),
                "success": success_count,
                "failed": fail_count,
            }
        }, status=status.HTTP_200_OK if success_count > 0 else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def submission_summary(self, request):
        test_id = request.query_params.get('test_id')
        queryset = self.get_queryset().select_related('test', 'student', 'user', 'variant')
        if test_id:
            queryset = queryset.filter(test_id=test_id)
        data = []
        for sub in queryset:
            data.append({
                'id': sub.id,
                'test_title': sub.test.title,
                'student_name': sub.student.name if sub.student else None,
                'detected_mssv': sub.detected_mssv or '',
                'variant_code': sub.variant.variant_code if sub.variant else '',
                'total_score': sub.total_score,
                'submission_image': sub.submission_image.url if sub.submission_image else None,
                'submitted_at': sub.submitted_at,
            })
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        submission = self.get_object()
        answers = PaperAnswerDetected.objects.filter(submission=submission).select_related('question')
        return Response({
            'submission_id': submission.id,
            'total_score': submission.total_score,
            'is_graded': submission.is_graded,
            'answers': [{'question_order': a.question.order,
                         'detected_answer': a.detected_answer,
                         'is_correct': a.is_correct} for a in answers]
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def detail(self, request, pk=None):
        submission = self.get_object()
        return Response(self.get_serializer(submission).data)

    @action(detail=False, methods=['get'])
    def student_details(self, request):
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response({"error": "student_id required"}, status=status.HTTP_400_BAD_REQUEST)
        submissions = self.get_queryset().filter(student_id=student_id)
        return Response(self.get_serializer(submissions, many=True).data)