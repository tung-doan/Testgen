# online_exams/serializers.py
from rest_framework import serializers
from .models import Exam, ExamAttempt, OnlineAnswer
from question_bank.models import Question

class ExamSerializer(serializers.ModelSerializer):
    """
    Serializer để tạo/cập nhật một Đề thi (khung đề).
    """
    # Ta dùng PrimaryKeyRelatedField để chỉ nhận ID câu hỏi khi tạo
    questions = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(), 
        many=True,
        write_only=True # Chỉ dùng khi tạo/update
    )
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'classroom', 'duration_minutes', 
            'max_attempts', 'show_results_immediately', 'questions'
        ]
        
    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        exam = Exam.objects.create(**validated_data)
        
        # Tạo các bản ghi ExamQuestion (bảng trung gian)
        for index, question in enumerate(questions_data):
            # Bạn có thể set điểm mặc định hoặc lấy từ đâu đó
            ExamQuestion.objects.create(
                exam=exam,
                question=question,
                order=index + 1,
                points=1.0 
            )
        return exam

# --- Serializers cho Học sinh làm bài ---

class OnlineAnswerSerializer(serializers.ModelSerializer):
    """Serializer cho câu trả lời của học sinh (JSON)"""
    class Meta:
        model = OnlineAnswer
        fields = ['question', 'answer_data'] # 'question' là ID

class ExamAttemptSerializer(serializers.ModelSerializer):
    """Serializer để nộp bài (gửi nhiều câu trả lời 1 lúc)"""
    answers = OnlineAnswerSerializer(many=True, write_only=True)
    
    class Meta:
        model = ExamAttempt
        fields = ['id', 'exam', 'student', 'status', 'final_score', 'answers']
        read_only_fields = ['status', 'final_score']

    def create(self, validated_data):
        # Đây là logic khi "Nộp bài"
        answers_data = validated_data.pop('answers')
        
        # 1. Tạo lượt làm bài (ExamAttempt)
        # Giả sử student và exam đã có trong `validated_data`
        attempt = ExamAttempt.objects.create(
            **validated_data, 
            status='COMPLETED' # Đánh dấu là đã nộp
        )
        
        total_score = 0
        
        # 2. Tạo các câu trả lời (OnlineAnswer) và chấm điểm
        for answer_data in answers_data:
            question = answer_data['question']
            student_answer = answer_data['answer_data'] # Đây là JSON
            
            # TODO: Logic chấm điểm
            # Bạn cần gọi một hàm (ví dụ: `grade_question`)
            # để so sánh `student_answer` (JSON) với đáp án đúng
            # trong `question_bank` và trả về điểm.
            
            score_for_this_question = 0.0 # Thay bằng logic chấm điểm thật
            
            OnlineAnswer.objects.create(
                attempt=attempt,
                question=question,
                answer_data=student_answer,
                score=score_for_this_question
            )
            total_score += score_for_this_question

        # 3. Lưu tổng điểm
        attempt.final_score = total_score
        attempt.save()
        return attempt