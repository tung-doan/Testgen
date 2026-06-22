from rest_framework import serializers
from .models import Classroom, PaperTest, PaperTestQuestion,PaperTestVariant, PaperSubmission, PaperAnswerDetected, PaperUserAnswer
from classrooms.models import Classroom
from question_bank.models import Question
from question_bank.serializers import QuestionDetailSerializer
from django.contrib.auth import get_user_model
import random

User = get_user_model()
class PaperTestQuestionSerializer(serializers.ModelSerializer):
    question_detail = QuestionDetailSerializer(source='question', read_only=True)
    
    class Meta:
        model = PaperTestQuestion
        fields = ['id', 'question', 'question_detail', 'order']


class PaperTestVariantSerializer(serializers.ModelSerializer):
    """Serializer cho Paper Test Variant"""
    
    class Meta:
        model = PaperTestVariant
        fields = [
            'id', 'test', 'variant_code', 'question_order', 
            'answer_shuffles', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class TestSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all(), allow_null=True)
    paper_questions = PaperTestQuestionSerializer(many=True, read_only=True)
    variants = PaperTestVariantSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    num_variants = serializers.IntegerField(default=1)
    variant_count = serializers.SerializerMethodField()

    class Meta:
        model = PaperTest
        fields = ['id', 'title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'created_by', 'classroom', 'created_at', 
                 'paper_questions', 'num_variants', 'variant_count', 'variants']

    def get_variant_count(self, obj):
        return obj.variants.count()
class TestCreateSerializer(serializers.ModelSerializer):
    questions = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True
    )
    classroom = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(), 
        allow_null=True, 
        required=False
    )

    class Meta:
        model = PaperTest
        fields = ['title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'classroom', 'questions', 'num_variants']

    def create(self, validated_data):
        questions_ids = validated_data.pop('questions', [])
        num_variants = validated_data.pop('num_variants', 1)
        validated_data['num_questions'] = len(questions_ids)
 # Tạo test
        test = PaperTest.objects.create(**validated_data)   
 # Thêm câu hỏi vào test (batch fetch + bulk create)
        questions = {q.id: q for q in Question.objects.filter(id__in=questions_ids)}
        test_questions = [
            PaperTestQuestion(test=test, question=questions[qid], order=idx)
            for idx, qid in enumerate(questions_ids, start=1)
            if qid in questions
        ]
        PaperTestQuestion.objects.bulk_create(test_questions)
        if num_variants > 0:
            generate_test_variants(test, num_variants)
        return test

    def update(self, instance, validated_data):
        questions_ids = validated_data.pop('questions', None)
        
 # Cập nhật các trường cơ bản
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

 # Cập nhật danh sách câu hỏi nếu có
        if questions_ids is not None:
 # Xóa tất cả câu hỏi cũ
            instance.paper_questions.all().delete()
            
 # Cập nhật num_questions
            instance.num_questions = len(questions_ids)
            instance.save()
            
 # Thêm câu hỏi mới (batch fetch + bulk create)
            questions = {q.id: q for q in Question.objects.filter(id__in=questions_ids)}
            test_questions = [
                PaperTestQuestion(test=instance, question=questions[qid], order=idx)
                for idx, qid in enumerate(questions_ids, start=1)
                if qid in questions
            ]
            PaperTestQuestion.objects.bulk_create(test_questions)

        return instance
    
def generate_test_variants(test, num_variants):
    """
    Tạo variants với mã 3 số:
    - Mỗi mã là tổ hợp 3 chữ số (0-9)
    - VD: 001, 012, 023, 134, 245...
    """
 # TẠO DANH SÁCH MÃ ĐỀ 3 SỐ
    used_codes = set()
    variant_codes = []
    
    while len(variant_codes) < num_variants:
 # Random 3 chữ số
        code = ''.join([str(random.randint(0, 9)) for _ in range(3)])
        
 # Đảm bảo không trùng
        if code not in used_codes:
            used_codes.add(code)
            variant_codes.append(code)
    
 # Lấy câu hỏi gốc
    original_questions = list(test.paper_questions.values_list('question_id', flat=True))
    num_choices = test.num_choices
    
    for code in variant_codes:
 # 1. Shuffle thứ tự câu hỏi
        shuffled_questions = original_questions.copy()
        random.shuffle(shuffled_questions)
        
 # 2. Shuffle thứ tự đáp án cho mỗi câu
        answer_shuffles = {}
        for q_id in shuffled_questions:
            shuffle_order = list(range(num_choices))
            random.shuffle(shuffle_order)
            answer_shuffles[str(q_id)] = shuffle_order
        
 # 3. Tạo variant
        PaperTestVariant.objects.create(
            test=test,
            variant_code=code,  #  MÃ 3 SỐ
            question_order=shuffled_questions,
            answer_shuffles=answer_shuffles
        )
class AnswerDetectedSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=PaperTestQuestion.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PaperAnswerDetected
        fields = ['id', 'submission', 'question', 'is_correct', 'score']

class UserAnswerSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=PaperTestQuestion.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PaperUserAnswer
        fields = ['id', 'submission', 'question', 'selected_options']


# 'answers', 'user_answers']

class SubmissionSerializer(serializers.ModelSerializer):
    submission_image = serializers.SerializerMethodField()
    
    class Meta:
        model = PaperSubmission
        fields = '__all__'
    
    def get_submission_image(self, obj):
        """
        Return Cloudinary URL if using CloudinaryField,
        otherwise return regular URL
        """
        if obj.submission_image:
 # Nếu dùng CloudinaryField
            if hasattr(obj.submission_image, 'url'):
                return obj.submission_image.url
 # Nếu lưu URL dạng string
            return str(obj.submission_image)
        return None