from rest_framework import serializers
from .models import Exam, ExamAttempt, OnlineAnswer, ExamQuestion
from question_bank.models import Question, AnswerOption

# ============== Answer Option Serializer ==============
class AnswerOptionForExamSerializer(serializers.ModelSerializer):
    """Serializer cho answer options khi làm bài - chỉ trả về data cần thiết"""
    class Meta:
        model = AnswerOption
        fields = [
            'id', 'text', 'order'
        ]

# ============== Question Serializers ==============
class QuestionDetailForExamSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho câu hỏi khi làm bài"""
    answer_options = AnswerOptionForExamSerializer(many=True, read_only=True, source='options')
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    allow_multiple_answers = serializers.SerializerMethodField()
    # Các field cho các loại câu hỏi khác nhau
    sub_questions = serializers.JSONField(read_only=True)  # For TFE
    items_to_order = serializers.JSONField(read_only=True)  # For ORD
    blanks = serializers.JSONField(read_only=True)  # For FIB
    
    class Meta:
        model = Question
        fields = [
            'id', 'prompt', 'question_type', 'question_type_display',
            'answer_options', 'sub_questions', 'items_to_order', 
            'blanks', 'correct_answer_text', 'allow_multiple_answers'
        ]

    def get_allow_multiple_answers(self, obj):
        """
        Kiểm tra xem câu hỏi có cho phép chọn nhiều đáp án hay không.
        Logic: Đếm số lượng đáp án đúng.
        """
        if obj.question_type == 'MC':
            # Cách 1: Dựa vào is_correct_bool (Ưu tiên nếu bạn đã chuyển sang dùng cái này)
            correct_count = obj.options.filter(is_correct_bool=True).count()
            
            # Cách 2: Dựa vào score_percentage (Nếu dữ liệu cũ dùng cái này)
            # correct_count = obj.options.filter(score_percentage__gt=0).count()
            
            # Cách 3: Kết hợp cả hai (An toàn nhất cho giai đoạn chuyển đổi)
            # Lấy tất cả options của câu hỏi
            options = obj.options.all()
            count = 0
            for opt in options:
                if opt.is_correct_bool is True:
                    count += 1
            
            return count > 1
            
        return False

# ============== ExamQuestion Serializers ==============
class ExamQuestionSerializer(serializers.ModelSerializer):
    """Serializer cho bảng trung gian ExamQuestion - dùng cho danh sách"""
    question = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = ExamQuestion
        fields = ['id', 'question', 'order', 'points']

class ExamQuestionDetailSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho ExamQuestion - dùng khi làm bài"""
    question = QuestionDetailForExamSerializer(read_only=True)
    
    class Meta:
        model = ExamQuestion
        fields = ['id', 'question', 'order', 'points']

# ============== Exam Serializers ==============
class ExamSerializer(serializers.ModelSerializer):
    """Serializer cơ bản cho Exam - dùng cho danh sách"""
    created_by = serializers.StringRelatedField(read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, allow_null=True)
    total_questions = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'classroom', 'classroom_name',
            'duration_minutes', 'max_attempts', 'show_results_immediately',
            'created_by', 'total_questions', 'total_points',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
        
    def get_total_questions(self, obj):
        return obj.examquestion_set.count()
    
    def get_total_points(self, obj):
        return sum(eq.points for eq in obj.examquestion_set.all())

class ExamCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer để tạo/cập nhật Exam"""
    questions = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(), 
        many=True,
        write_only=True
    )
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'classroom',
            'duration_minutes', 'max_attempts', 'show_results_immediately',
            'questions'
        ]
    
    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        exam = Exam.objects.create(**validated_data)
        
        # Tạo các bản ghi ExamQuestion
        for index, question in enumerate(questions_data):
            ExamQuestion.objects.create(
                exam=exam,
                question=question,
                order=index + 1,
                points=1.0
            )
        return exam
    
    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update questions if provided
        if questions_data is not None:
            instance.examquestion_set.all().delete()
            
            for index, question in enumerate(questions_data):
                ExamQuestion.objects.create(
                    exam=instance,
                    question=question,
                    order=index + 1,
                    points=question.points
                )
        
        return instance

class ExamDetailForAttemptSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho Exam khi làm bài - bao gồm toàn bộ câu hỏi"""
    exam_questions = ExamQuestionDetailSerializer(
        source='examquestion_set',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'duration_minutes',
            'max_attempts', 'show_results_immediately',
            'exam_questions'
        ]

# ============== Answer Serializers ==============
class OnlineAnswerSerializer(serializers.ModelSerializer):
    """Serializer cho câu trả lời của học sinh"""
    question = serializers.PrimaryKeyRelatedField(queryset=Question.objects.all())
    
    class Meta:
        model = OnlineAnswer
        fields = ['question', 'answer_data', 'score']
        read_only_fields = ['score']

class OnlineAnswerDetailSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ để xem kết quả"""
    question = QuestionDetailForExamSerializer(read_only=True)
    
    class Meta:
        model = OnlineAnswer
        fields = ['id', 'question', 'answer_data', 'score']

# ============== ExamAttempt Serializers ==============
class ExamAttemptSerializer(serializers.ModelSerializer):
    """Serializer cơ bản cho ExamAttempt - dùng khi làm bài"""
    exam_detail = ExamDetailForAttemptSerializer(source='exam', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_detail', 'student', 'student_name',
            'status', 'start_time', 'end_time', 'final_score'
        ]
        read_only_fields = ['id', 'start_time', 'end_time', 'final_score', 'status']

class ExamAttemptCreateSerializer(serializers.ModelSerializer):
    """Serializer để tạo attempt mới (start exam)"""
    
    class Meta:
        model = ExamAttempt
        fields = ['id', 'exam', 'student']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        # Tạo attempt với status IN_PROGRESS
        attempt = ExamAttempt.objects.create(
            **validated_data,
            status='IN_PROGRESS'
        )
        return attempt

class ExamAttemptSubmitSerializer(serializers.Serializer):
    """Serializer để submit bài thi"""
    answers = OnlineAnswerSerializer(many=True)
    
    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError("Answers cannot be empty")
        return value
    
    def save(self, attempt):
        """Lưu câu trả lời và chấm điểm"""
        from .grading import grade_question, convert_to_scale_10
        from django.utils import timezone
        
        answers_data = self.validated_data['answers']
        total_raw_score = 0.0
        total_max_raw_score = 0.0
        
        # Xóa câu trả lời cũ nếu có
        attempt.answers.all().delete()
        
        # Tạo các câu trả lời mới và chấm điểm
        for answer_data in answers_data:
            question = answer_data['question']
            student_answer = answer_data['answer_data']
            
            # Lấy điểm của câu hỏi trong đề thi
            try:
                exam_question = ExamQuestion.objects.get(
                    exam=attempt.exam,
                    question=question
                )
            except ExamQuestion.DoesNotExist:
                continue
            
            # Chấm điểm
            raw_score = grade_question(question, student_answer, exam_question.points)
            
            OnlineAnswer.objects.create(
                attempt=attempt,
                question=question,
                answer_data=student_answer,
                score=raw_score
            )
            total_raw_score += raw_score
            total_max_raw_score += exam_question.points
        
        final_score_10 = convert_to_scale_10(total_raw_score, total_max_raw_score)
        # Cập nhật attempt
        attempt.status = 'COMPLETED'
        attempt.end_time = timezone.now()
        attempt.final_score = final_score_10
        attempt.save()
        
        return attempt

class ExamAttemptResultSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ để xem kết quả"""
    answers = OnlineAnswerDetailSerializer(many=True, read_only=True)
    exam_detail = ExamSerializer(source='exam', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    duration_taken = serializers.SerializerMethodField()
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_detail', 'student', 'student_name',
            'status', 'start_time', 'end_time', 'final_score',
            'answers', 'duration_taken'
        ]
    
    def get_duration_taken(self, obj):
        if obj.end_time and obj.start_time:
            duration = obj.end_time - obj.start_time
            return int(duration.total_seconds() / 60)  # minutes
        return None

class ExamAttemptListSerializer(serializers.ModelSerializer):
    """Serializer cho danh sách attempts - dùng cho teacher xem submissions"""
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.SerializerMethodField()
    duration_taken = serializers.SerializerMethodField()

    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'student', 'student_name', 'student_email',
            'status', 'start_time', 'end_time', 'final_score',
            'duration_taken'
        ]

    def get_student_email(self, obj):
        if obj.student and obj.student.user:
            return obj.student.user.email or ""
        return ""

    def get_duration_taken(self, obj):
        if obj.end_time and obj.start_time:
            duration = obj.end_time - obj.start_time
            return int(duration.total_seconds() / 60)
        return None