from rest_framework import serializers
from .models import Exam, ExamAttempt, OnlineAnswer, ExamQuestion
from question_bank.models import Question, AnswerOption
from classrooms.models import Classroom

# ============== Answer Option Serializer ==============
class AnswerOptionForExamSerializer(serializers.ModelSerializer):
    """Serializer cho answer options khi làm bài - chỉ trả về data cần thiết"""
    class Meta:
        model = AnswerOption
        fields = [
            'id', 'text', 'order'
        ]

class AnswerOptionWithCorrectnessSerializer(serializers.ModelSerializer):
    """Serializer cho answer options khi xem kết quả - bao gồm đáp án đúng"""
    class Meta:
        model = AnswerOption
        fields = [
            'id', 'text', 'order', 'is_correct_bool', 'correct_order'
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
            'id', 'prompt', 'image', 'question_type', 'question_type_display',
            'answer_options', 'sub_questions', 'items_to_order', 
            'blanks', 'allow_multiple_answers'
        ]

    def get_allow_multiple_answers(self, obj):
        if obj.question_type == 'MC':
            options = obj.options.all()
            count = 0
            for opt in options:
                if opt.is_correct_bool is True:
                    count += 1
            return count > 1
        return False

class QuestionWithCorrectAnswersSerializer(QuestionDetailForExamSerializer):
    """Serializer cho câu hỏi khi xem kết quả - bao gồm đáp án đúng"""
    answer_options = AnswerOptionWithCorrectnessSerializer(many=True, read_only=True, source='options')
    
    class Meta:
        model = Question
        fields = QuestionDetailForExamSerializer.Meta.fields + ['correct_answer_text']

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
            'is_published', 'publish_at',
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
    classroom = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(),
        required=True,
        allow_null=False,
    )
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
            'is_published', 'publish_at',
            'questions'
        ]

    def validate(self, attrs):
        classroom = attrs.get('classroom') or getattr(self.instance, 'classroom', None)
        if classroom is None:
            raise serializers.ValidationError({
                'classroom': 'Class is required.'
            })

        request = self.context.get('request')
        if request and request.user.is_authenticated and classroom.teacher != request.user:
            raise serializers.ValidationError({
                'classroom': 'You can only assign exams to your own classes.'
            })

        return attrs
    
    def create(self, validated_data):
        questions_data = validated_data.pop('questions')

        # Basic validation for scheduling: if exam is not published now, require publish_at
        is_published = validated_data.get('is_published', True)
        publish_at = validated_data.get('publish_at', None)
        if not is_published and not publish_at:
            raise serializers.ValidationError({
                'publish_at': 'publish_at is required when is_published is false (scheduled publish).'
            })

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
        
        # Validation for scheduled publish on update
        if 'is_published' in validated_data and validated_data.get('is_published') is False:
            if not validated_data.get('publish_at') and not instance.publish_at:
                raise serializers.ValidationError({
                    'publish_at': 'publish_at is required when is_published is false (scheduled publish).'
                })

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
                    points=1.0
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
    question = serializers.SerializerMethodField()
    
    class Meta:
        model = OnlineAnswer
        fields = ['id', 'question', 'answer_data', 'score']

    def get_question(self, obj):
        request = self.context.get('request')
        exam = obj.attempt.exam
        
        show_correct = False
        if request and request.user.is_authenticated:
            # Teacher sees everything
            if request.user == exam.created_by:
                show_correct = True
            # Student sees if allowed
            elif exam.show_results_immediately:
                show_correct = True
        
        if show_correct:
            return QuestionWithCorrectAnswersSerializer(obj.question, context=self.context).data
        return QuestionDetailForExamSerializer(obj.question, context=self.context).data

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
    answers = OnlineAnswerSerializer(many=True, required=False, allow_empty=True)
    
    def save(self, attempt):
        """Lưu câu trả lời và chấm điểm"""
        from .grading import grade_question, convert_to_scale_10
        from django.utils import timezone
        
        answers_data = self.validated_data.get('answers', [])
        total_raw_score = 0.0
        
        # Lấy tổng điểm tối đa của toàn bộ bài thi
        total_max_raw_score = sum(eq.points for eq in ExamQuestion.objects.filter(exam=attempt.exam))
        
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
        
        final_score_10 = convert_to_scale_10(total_raw_score, total_max_raw_score)
        # Cập nhật attempt
        attempt.status = 'COMPLETED'
        attempt.end_time = timezone.now()
        attempt.final_score = final_score_10
        attempt.save()
        
        return attempt

class ExamAttemptResultSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ để xem kết quả - bao gồm cả câu chưa làm"""
    answers = serializers.SerializerMethodField()
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
    
    def get_answers(self, obj):
        """Trả về kết quả cho TOÀN BỘ câu hỏi trong bài thi"""
        # Lấy tất cả câu hỏi của đề thi này, sắp xếp theo thứ tự
        exam_questions = ExamQuestion.objects.filter(exam=obj.exam).select_related('question').order_by('order')
        
        # Lấy các câu trả lời thực tế đã lưu
        actual_answers = {a.question_id: a for a in obj.answers.all()}
        
        results = []
        for eq in exam_questions:
            answer = actual_answers.get(eq.question_id)
            if answer:
                # Nếu có câu trả lời thực tế
                results.append(OnlineAnswerDetailSerializer(answer, context=self.context).data)
            else:
                # Nếu không làm câu này, tạo một đối tượng "ảo" để serializer vẫn render được
                virtual_answer = OnlineAnswer(
                    attempt=obj,
                    question=eq.question,
                    answer_data=None,
                    score=0.0
                )
                results.append(OnlineAnswerDetailSerializer(virtual_answer, context=self.context).data)
        return results
    
    def get_duration_taken(self, obj):
        if obj.end_time and obj.start_time:
            duration = obj.end_time - obj.start_time
            return int(duration.total_seconds() / 60)  # minutes
        return None

class ExamAttemptInProgressSerializer(serializers.ModelSerializer):
    """Serializer for IN_PROGRESS attempts - includes full exam questions for taking exam"""
    exam_detail = ExamDetailForAttemptSerializer(source='exam', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    saved_answers = serializers.SerializerMethodField()
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_detail', 'student', 'student_name',
            'status', 'start_time', 'end_time', 'final_score',
            'saved_answers'
        ]
    
    def get_saved_answers(self, obj):
        """Return any previously saved answers so student can resume"""
        answers = obj.answers.all()
        if not answers.exists():
            return {}
        result = {}
        for answer in answers:
            result[str(answer.question_id)] = {
                'question': answer.question_id,
                'answer_data': answer.answer_data
            }
        return result

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
