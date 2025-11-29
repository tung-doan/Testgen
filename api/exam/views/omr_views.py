from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from exam.models import PaperTest, PaperTestQuestion, PaperSubmission, PaperAnswerDetected, Classroom, Student, PaperUserAnswer
from rest_framework.decorators import authentication_classes
from exam.serializers import (
    TestSerializer, TestCreateSerializer, 
    QuestionSerializer, QuestionCreateSerializer,
    SubmissionSerializer
)
from django.db.models import Count, Avg
from .omr_processing import process_submission_cloudinary
import cloudinary
import cloudinary.uploader
import threading

pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
font_name = "DejaVuSans"

class TestViewSet(viewsets.ModelViewSet):
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PaperTest.objects.filter(created_by=self.request.user)
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TestCreateSerializer
        return TestSerializer
    
    def perform_create(self, serializer):
        test = serializer.save(created_by=self.request.user)
        for i in range(test.num_questions):
            PaperTestQuestion.objects.create(test=test, text=f"Question {i+1}", correct_answer="")
        
    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        test = self.get_object()
        serializer = QuestionCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(test=test)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def get_test_data(self, request, pk=None):
        test = self.get_object()
        serializer = TestSerializer(test)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def test_summary(self, request):
        tests = PaperTest.objects.filter(created_by=request.user).annotate(
            num_participants=Count('submissions'),
            avg_score=Avg('submissions__total_score')
        )

        summary_data = [
            {
                'id': test.id,
                'name': test.title,
                'num_participants': test.num_participants,
                'date_created': test.created_at.strftime('%Y-%m-%d'),
                'average_score': round(test.avg_score, 2) if test.avg_score is not None else 0
            }
            for test in tests
        ]
        
        return Response(summary_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def get_answer_keys(self, request, pk=None):
        test = self.get_object()
        # Fetch questions ordered by ID (or question_number if you added that field)
        questions = Question.objects.filter(test=test).order_by('id')
        if not questions:
            return Response(
                {"error": "No questions found for this test."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build answer keys dictionary: { "1": "A", "2": "B", ... }
        answer_keys = {}
        for idx, question in enumerate(questions, start=1):
            answer_keys[str(idx)] = question.correct_answer if question.correct_answer else ""

        return Response({"answer_keys": answer_keys}, status=status.HTTP_200_OK)
    
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def preview_test_pdf(self, request):
        # try:
        #     test_name = request.data.get('testName', 'ĐỀ KIỂM TRA')
        #     num_choices = int(request.data.get('numChoices', 4))
        #     num_questions = int(request.data.get('numQuestions', 30))  # Default to 30
        #     multiple_choice = request.data.get('multipleChoice', 'yes') == 'yes'

        #     if num_choices < 1 or num_choices > 26:
        #         return Response({"error": "Số lựa chọn phải từ 1 đến 26"}, status=400)
        #     if num_questions < 1 or num_questions > 50:
        #         return Response({"error": "Số câu hỏi phải từ 1 đến 50"}, status=400)

        #     buffer = BytesIO()
        #     p = canvas.Canvas(buffer, pagesize=A4)
        #     width, height = A4

        #     # Constants
        #     margin = 2 * cm
        #     bubble_size = 0.35 * cm
        #     choice_spacing = 0.9 * cm
        #     line_spacing = 0.9 * cm
        #     col_width = (width - 2 * margin) / 3
        #     marker_size = 0.45 * cm
        #     max_questions_per_col = 10

        #     def draw_marker(x, y):
        #         p.setFillColorRGB(0, 0, 0)
        #         p.rect(x, y, marker_size, marker_size, fill=1)

        #     # --- Draw 4 corner markers ---
        #     # draw_marker(margin - marker_size, height - margin)
        #     # draw_marker(width - margin, height - margin)
        #     # draw_marker(margin - marker_size, margin - marker_size)
        #     # draw_marker(width - margin, margin - marker_size)

        #     # --- Tiêu đề ---
        #     current_y = height - margin
        #     p.setFont(font_name, 12)
        #     p.drawCentredString(width / 2, current_y, test_name.upper())
        #     current_y -= 1.5 * cm

        #     # --- Họ tên và lớp ---
        #     p.setFont(font_name, 10)
        #     p.drawString(margin, current_y, "Họ và tên: ___________________________")
        #     p.drawString(width / 2 + 3 * cm, current_y, "Lớp: ________________")
        #     current_y -= 1.5 * cm

        #     # --- Chia câu hỏi mỗi cột 10 câu ---
        #     p.setFont(font_name, 8)
        #     num_cols = (num_questions + max_questions_per_col - 1) // max_questions_per_col

        #     # Calculate the total width of the question row (number + choices)
        #     question_row_width = 0.6 * cm + num_choices * (bubble_size + choice_spacing)

        #     for col_index in range(num_cols):
        #         start_q = col_index * max_questions_per_col + 1
        #         end_q = min(start_q + max_questions_per_col - 1, num_questions)

        #         # Center the column within its allocated space
        #         x_col_start = margin + (col_index % 3) * col_width
        #         x_col_center_offset = (col_width - question_row_width) / 2
        #         x_start = x_col_start + x_col_center_offset

        #         # Adjust y position for rows (if more than 3 columns, stack vertically)
        #         y = current_y - (col_index // 3) * (max_questions_per_col * line_spacing + 1.0 * cm)

        #         for q_num in range(start_q, end_q + 1):
        #             if q_num == 1:
        #                 print(f"Tọa độ đầu số 1: ({x_start}cm, {y}cm)")
        #             p.setFont("Helvetica-Bold", 9)  # Số to rõ hơn và đậm
        #             p.setLineWidth(1)  # Dành cho bubble
        #             p.setFillColorRGB(0, 0, 0)
        #             p.drawString(x_start, y, f"{q_num}")
        #             x_choices = x_start + 0.6 * cm
        #             for i in range(num_choices):
        #                 letter = chr(65 + i)
        #                 if multiple_choice:
        #                     # Vẽ ô vuông nếu multipleChoice là 'yes'
        #                     p.setLineWidth(1.5)  # Làm viền đậm hơn
        #                     p.rect(x_choices, y - bubble_size / 2, bubble_size, bubble_size, fill=0)
        #                 else:
        #                     # Vẽ hình tròn nếu multipleChoice là 'no'
        #                     p.setLineWidth(1.5)  # Làm viền đậm hơn
        #                     p.circle(x_choices + bubble_size / 2, y, bubble_size / 2, fill=0)
        #                 p.setFont(font_name, 8)  # Để chữ cái A, B, C... nhỏ vừa
        #                 p.drawString(x_choices + bubble_size + 0.05 * cm, y - 0.1 * cm, letter)
        #                 x_choices += choice_spacing
        #             y -= line_spacing

        #         # Keep track of the lowest y position for the "Mã Đề" placement
        #         if col_index == num_cols - 1:
        #             lowest_y = y

        #     # # --- Mã đề ---
        #     # p.setFont(font_name, 8)
        #     # code_y = lowest_y - 0.5 * cm  # Reduced gap to 0.5 cm below the last question row
        #     # p.drawString(width - margin - 4.5 * cm, code_y + 0.7 * cm, "Mã Đề")
        #     # for i in range(1, 5):
        #     #     x = width - margin - 4.5 * cm + (i - 1) * 1.2 * cm
        #     #     p.circle(x + bubble_size / 2, code_y, bubble_size / 2, fill=0)
        #     #     p.drawString(x + bubble_size + 0.05 * cm, code_y - 0.1 * cm, str(i))
                
        #     # --- Dải barcode dọc ---
        #     # p.saveState()
        #     # p.translate(margin - 0.8 * cm, height / 2)
        #     # p.rotate(90)
        #     # p.setFont(font_name, 6)
        #     # p.setLineWidth(0.05 * cm)
        #     # for i in range(5):
        #     #     p.line(0.2 * cm + i * 0.1 * cm, -2 * cm, 0.2 * cm + i * 0.1 * cm, 2 * cm)
        #     # p.restoreState()

        #     p.showPage()
        #     p.save()
        #     buffer.seek(0)

        #     return FileResponse(buffer, as_attachment=False, filename='preview_test.pdf', content_type='application/pdf')
    
        # except Exception as e:
        #     return Response({"error": str(e)}, status=500)
        try:
            test_name = request.data.get('testName', 'ĐỀ KIỂM TRA')
            num_choices = int(request.data.get('numChoices', 4))
            num_questions = int(request.data.get('numQuestions', 25))  # Tối đa 30 câu
            multiple_choice = request.data.get('multipleChoice', 'yes') == 'yes'

            if num_choices < 1 or num_choices > 26:
                return Response({"error": "Số lựa chọn phải từ 1 đến 26"}, status=400)
            if num_questions < 1 or num_questions > 25:
                return Response({"error": "Số câu hỏi phải từ 1 đến 25"}, status=400)

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # Constants
            margin = 2 * cm
            bubble_size = 0.35 * cm
            choice_spacing = 0.9 * cm
            line_spacing = 0.9 * cm

            # --- Tiêu đề ---
            current_y = height - margin
            p.setFont(font_name, 12)
            p.drawCentredString(width / 2, current_y, test_name.upper())
            current_y -= 1.5 * cm

            # --- Họ tên và lớp ---
            p.setFont(font_name, 10)
            p.drawString(margin, current_y, "Họ và tên: ___________________________")
            p.drawString(width / 2 + 3 * cm, current_y, "Lớp: ________________")
            current_y -= 1.5 * cm

            # --- Hiển thị câu hỏi 1 cột ---
            p.setFont(font_name, 8)

            # Tính x_start sao cho câu hỏi nằm chính giữa
            question_row_width = 0.6 * cm + num_choices * (bubble_size + choice_spacing)
            # x_start = margin + (width - 2 * margin - question_row_width) / 2
            x_start = margin
            y = current_y

            for q_num in range(1, num_questions + 1):
                p.setFont("Helvetica-Bold", 9)
                p.setLineWidth(1)
                p.setFillColorRGB(0, 0, 0)
                p.drawString(x_start, y, f"{q_num}")
                x_choices = x_start + 0.6 * cm
                for i in range(num_choices):
                    letter = chr(65 + i)
                    if multiple_choice:
                        p.setLineWidth(1.5)
                        p.rect(x_choices, y - bubble_size / 2, bubble_size, bubble_size, fill=0)
                    else:
                        p.setLineWidth(1.5)
                        p.circle(x_choices + bubble_size / 2, y, bubble_size / 2, fill=0)
                    p.setFont(font_name, 8)
                    p.drawString(x_choices + bubble_size + 0.05 * cm, y - 0.1 * cm, letter)
                    x_choices += choice_spacing
                y -= line_spacing

            p.showPage()
            p.save()
            buffer.seek(0)

            return FileResponse(buffer, as_attachment=False, filename='preview_test.pdf', content_type='application/pdf')

        except Exception as e:
            return Response({"error": str(e)}, status=500)
        

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save_answer_keys(self, request, pk=None):
        test = self.get_object()
        answer_keys = request.data.get('answer_keys', {})  # Expecting {question_number: answer, ...}

        if not answer_keys:
            return Response(
                {"error": "No answer keys provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch all questions for the test, ordered by ID
        questions = PaperTestQuestion.objects.filter(test=test).order_by('id')
        if not questions:
            return Response(
                {"error": "No questions found for this test."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate that the number of answer keys matches the number of questions
        if len(answer_keys) != len(questions):
            return Response(
                {"error": f"Expected {len(questions)} answer keys, but got {len(answer_keys)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        for question_number, answer in answer_keys.items():
            try:
                # Convert question_number to integer
                q_num = int(question_number)
                if q_num < 1 or q_num > len(questions):
                    return Response(
                        {"error": f"Invalid question number {q_num}. Must be between 1 and {len(questions)}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Map question_number to the corresponding Question object (1-based index to 0-based index)
                question = questions[q_num - 1]

                # Validate the answer (assuming answers are A, B, C, etc.)
                valid_answers = [chr(65 + i) for i in range(test.num_choices)]  # e.g., ['A', 'B', 'C', 'D']
                if answer not in valid_answers:
                    return Response(
                        {"error": f"Invalid answer '{answer}' for question {q_num}. Must be one of {valid_answers}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Save the correct answer
                question.correct_answer = answer
                question.save()

            except ValueError:
                return Response(
                    {"error": f"Question number '{question_number}' must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response({"message": "Answer keys saved successfully"}, status=status.HTTP_200_OK)
    
class StatisticViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='top-students')
    def get_top_students(self, request):
        # Lấy top 3 học sinh có điểm trung bình cao nhất
        top_3 = Student.objects.annotate(avg_score=Avg('submissions__total_score')) \
            .filter(submissions__total_score__isnull=False) \
            .order_by('-avg_score')[:3]

        # Lấy top 10 học sinh (bao gồm top 3)
        top_10 = Student.objects.annotate(avg_score=Avg('submissions__total_score')) \
            .filter(submissions__total_score__isnull=False) \
            .order_by('-avg_score')[:10]

        top_3_data = [
            {
                'id': student.id,
                'name': student.name,
                'student_id': student.student_id,
                'average_score': float(student.avg_score) if student.avg_score else 0.0,
                'class_name': student.classroom.name if student.classroom else "N/A"
            } for student in top_3
        ]

        top_10_data = [
            {
                'id': student.id,
                'name': student.name,
                'student_id': student.student_id,
                'average_score': float(student.avg_score) if student.avg_score else 0.0,
                'class_name': student.classroom.name if student.classroom else "N/A"
            } for student in top_10
        ]

        return Response({
            'top_3_students': top_3_data,
            'top_10_students': top_10_data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='test-statistics')
    def get_test_statistics(self, request):
        # Lấy thống kê điểm trung bình của từng bài kiểm tra
        tests = PaperTest.objects.annotate(avg_score=Avg('submissions__total_score')) \
            .filter(submissions__total_score__isnull=False) \
            .order_by('id')

        # Dữ liệu cho tất cả bài kiểm tra
        all_tests_data = [
            {
                'id': test.id,
                'title': test.title,
                'average_score': round(float(test.avg_score), 2) if test.avg_score else 0.0
            } for test in tests
        ]

        return Response({
            'all_tests': all_tests_data
        }, status=status.HTTP_200_OK)
        
    # Thêm vào lớp StatisticViewSet
    @action(detail=True, methods=['get'], url_path='test-question-stats')
    def get_test_question_stats(self, request, pk=None):
        try:
            test = PaperTest.objects.get(id=pk)
            submissions = PaperSubmission.objects.filter(test=test)
            
            if not submissions.exists():
                return Response({"error": "No submissions found for this test"}, status=status.HTTP_404_NOT_FOUND)
            
            # Tính điểm trung bình của bài kiểm tra
            average_score = submissions.aggregate(avg_score=Avg('total_score'))['avg_score'] or 0
            
            # Phân tích từng câu hỏi
            question_stats = []
            
            # Lấy tất cả câu hỏi của bài test
            questions = PaperTestQuestion.objects.filter(test=test)
            
            # Thống kê cho từng câu hỏi
            for question_index, question in enumerate(questions, start=1):  # đánh số từ 1
                # Đếm số lượng đúng/sai cho từng câu hỏi
                answers_detected = PaperAnswerDetected.objects.filter(
                    submission__in=submissions,
                    question=question
                )
                
                total_answered = answers_detected.count()
                correct_count = answers_detected.filter(is_correct=True).count()
                
                # Tìm đáp án sai phổ biến nhất
                wrong_answers = {}
                for answer in answers_detected.filter(is_correct=False):
                    # Lấy user answer từ câu trả lời này
                    user_answer = PaperUserAnswer.objects.filter(
                        submission=answer.submission,
                        question=question
                    ).first()
                    
                    if user_answer and user_answer.selected_option:
                        if user_answer.selected_option not in wrong_answers:
                            wrong_answers[user_answer.selected_option] = 0
                        wrong_answers[user_answer.selected_option] += 1
                
                # Tìm đáp án sai phổ biến nhất
                common_wrong = None
                max_count = 0
                for answer, count in wrong_answers.items():
                    if count > max_count:
                        max_count = count
                        common_wrong = answer
                
                # Tính tỷ lệ đúng
                correct_percentage = correct_count / total_answered if total_answered > 0 else 0
                
                question_stats.append({
                    'question_number': question_index,  # Sử dụng số thứ tự thay vì trường question_number
                    'correct_count': correct_count,
                    'wrong_count': total_answered - correct_count,
                    'correct_percentage': correct_percentage,
                    'common_wrong_answer': common_wrong
                })
            
            # Tính tỷ lệ đúng trung bình
            avg_correct = sum(q['correct_percentage'] for q in question_stats) / len(question_stats) if question_stats else 0
            
            return Response({
                'total_submissions': len(submissions),
                'average_score': average_score,
                'average_correct_rate': avg_correct * 100,
                'question_stats': question_stats
            })
        
        except PaperTest.DoesNotExist:
            return Response({"error": "Test not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PaperSubmission.objects.filter(user=self.request.user)
    
    
    # def destroy(self, request, *args, **kwargs):
    #     submission = self.get_object()
    #     # Kiểm tra quyền xóa: chỉ cho phép xóa submission của chính mình hoặc bạn có thể kiểm tra thêm quyền admin, giáo viên...
    #     if submission.test.created_by != request.user:
    #         return Response({"error": "You are not authorized to delete this submission."}, status=status.HTTP_403_FORBIDDEN)
    #     submission.delete()
    #     return Response({"message": "Submission deleted successfully!"}, status=status.HTTP_204_NO_CONTENT)
    
    def destroy(self, request, *args, **kwargs):
        submission = self.get_object()
        
        if submission.test.created_by != request.user:
            return Response(
                {"error": "You are not authorized to delete this submission."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if submission.submission_image:
            try:
                public_id = submission.submission_image.public_id
                cloudinary.uploader.destroy(public_id)
            except Exception as e:
                print(f"Error deleting image from Cloudinary: {e}")
        
        submission.delete()
        return Response(
            {"message": "Submission deleted successfully!"}, 
            status=status.HTTP_204_NO_CONTENT
        )
    
    # @action(detail=False, methods=['post'])
    # def upload_submission(self, request):
    #     test_id = request.data.get('test_id')
    #     student_id = request.data.get('student_id')
    #     if not test_id:
    #         return Response({"error": "Test ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    #     test = get_object_or_404(Test, id=test_id)
    #     if 'submission_image' not in request.FILES:
    #         return Response({"error": "Submission image is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    #     student = None
    #     if student_id:
    #         student = get_object_or_404(Student, id=student_id)
    #         if test.classroom and student.classroom != test.classroom:
    #             return Response({"error": "Student does not belong to the test's classroom."}, status=status.HTTP_400_BAD_REQUEST)
        
    #     submission = Submission.objects.create(
    #         test=test,
    #         user=request.user,
    #         student=student,    # Liên kết với học sinh hoặc None
    #         submission_image=request.FILES['submission_image']
    #     )

    #     threading.Thread(target=process_submission, args=(submission.id,)).start()
        
    #     return Response({
    #         "submission_id": submission.id,
    #         "message": "Submission uploaded successfully and is being processed"
    #     }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['post'])
    def upload_submission(self, request):
        test_id = request.data.get('test_id')
        student_id = request.data.get('student_id')
        
        if not test_id:
            return Response(
                {"error": "Test ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        test = get_object_or_404(PaperTest, id=test_id)
        
        if 'submission_image' not in request.FILES:
            return Response(
                {"error": "Submission image is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student = None
        if student_id:
            student = get_object_or_404(Student, id=student_id)
            if test.classroom and student.classroom != test.classroom:
                return Response(
                    {"error": "Student does not belong to the test's classroom."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Upload image to Cloudinary
        uploaded_file = request.FILES['submission_image']
        
        try:
            # Upload với tên file tùy chỉnh
            upload_result = cloudinary.uploader.upload(
                uploaded_file,
                folder=f"testgen/submissions/test_{test_id}",
                public_id=f"submission_{student.student_id if student else request.user.username}_{test_id}",
                resource_type="image",
                overwrite=True,
                transformation=[
                    {'quality': 'auto'},
                    {'fetch_format': 'auto'}
                ]
            )
            
            # Tạo submission với Cloudinary URL
            submission = PaperSubmission.objects.create(
                test=test,
                user=request.user,
                student=student,
                submission_image=upload_result['secure_url']  # Lưu URL từ Cloudinary
            )
            
            # Process submission trong background thread
            threading.Thread(
                target=process_submission_cloudinary, 
                args=(submission.id, upload_result['secure_url'])
            ).start()
            
            return Response({
                "submission_id": submission.id,
                "image_url": upload_result['secure_url'],
                "message": "Submission uploaded successfully and is being processed"
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to upload image: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def submission_summary(self, request):
        submissions = PaperSubmission.objects.filter(test__created_by=request.user)
        
        # Prepare the data for the response
        summary_data = [
            {
                'id': submission.id,
                'participant_name': submission.user.username,
                'score': submission.total_score if submission.total_score is not None else 0,
                'submission_image': submission.submission_image.url if submission.submission_image else None,
                'test_id': submission.test.id,
                'student_name': submission.student.name if submission.student else "N/A",
                'created_at': submission.submitted_at, 
            }
            for submission in submissions
        ]
        
        return Response(summary_data, status=status.HTTP_200_OK)
    
    
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        submission = self.get_object()
        serializer = SubmissionSerializer(submission)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def student_details(self, request):
        # Lấy tham số từ query params
        name = request.query_params.get('name', '')
        class_name = request.query_params.get('class', '')
        print(f"Filtering submissions for name: {name}, class: {class_name}")
        # Lọc danh sách submission thuộc giáo viên hiện tại
        queryset = PaperSubmission.objects.filter(test__created_by=request.user)

        # Lọc theo tên học sinh nếu có
        if name:
            queryset = queryset.filter(student__name__icontains=name)

        # Lọc theo tên lớp nếu có
        if class_name:
            queryset = queryset.filter(student__classroom__name__icontains=class_name)

        # Chuẩn bị dữ liệu phản hồi
        details_data = [
            {
                'student_name': submission.student.name if submission.student else "N/A",
                'mssv': submission.student.student_id if submission.student else "N/A",
                'class_name': submission.student.classroom.name if submission.student and submission.student.classroom else "N/A",
                'score': submission.total_score if submission.total_score is not None else 0,
                'submission_image': submission.submission_image.url if submission.submission_image else None,
            }
            for submission in queryset
        ]

        return Response(details_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='detail')
    def get_submission_detail(self, request, pk=None):
        try:
            submission = PaperSubmission.objects.get(id=pk)
            serializer = SubmissionSerializer(submission)
            return Response(serializer.data)
        except PaperSubmission.DoesNotExist:
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)