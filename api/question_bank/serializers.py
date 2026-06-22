from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Subject, Chapter, Section, Question, AnswerOption

class SubjectSerializer(serializers.ModelSerializer):
    chapter_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'created_at', 'updated_at', 'chapter_count']
        read_only_fields = ['created_at', 'updated_at']
        
    def get_chapter_count(self, obj):
        count = getattr(obj, 'chapter_count', None)
        if count is not None:
            return count
        return obj.chapters.count()

class ChapterSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    section_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chapter
        fields = ['id', 'name', 'subject', 'subject_name', 'order', 'created_at', 'updated_at', 'section_count']
        read_only_fields = ['created_at', 'updated_at']
        validators = [
            UniqueTogetherValidator(
                queryset=Chapter.objects.all(),
                fields=['subject', 'order'],
                message="This order number is already used in this subject. Please choose a different order."
            )
        ]
    
    def get_section_count(self, obj):
        count = getattr(obj, 'section_count', None)
        if count is not None:
            return count
        return obj.sections.count()
    
    def validate_subject(self, value):
        request = self.context.get('request')
        if request and value.created_by != request.user:
            raise serializers.ValidationError("You don't have permission to add chapters to this subject.")
        return value
    
    def validate_order(self, value):
        if value < 1:
            raise serializers.ValidationError("Order must be at least 1")
        return value

class SectionSerializer(serializers.ModelSerializer):
    chapter_name = serializers.CharField(source='chapter.name', read_only=True)
    subject_name = serializers.CharField(source='chapter.subject.name', read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'chapter', 'chapter_name', 'subject_name', 'order', 'created_at', 'updated_at', 'question_count']
        read_only_fields = ['created_at', 'updated_at']
        validators = [
            UniqueTogetherValidator(
                queryset=Section.objects.all(),
                fields=['chapter', 'order'],
                message="This order number is already used in this chapter. Please choose a different order."
            )
        ]
    
    def get_question_count(self, obj):
        count = getattr(obj, 'question_count', None)
        if count is not None:
            return count
        return obj.questions.filter(is_active=True).count()
    
    def validate_chapter(self, value):
        request = self.context.get('request')
        if request and value.subject.created_by != request.user:
            raise serializers.ValidationError("You don't have permission to add sections to this chapter.")
        return value
    
    def validate_order(self, value):
        if value < 1:
            raise serializers.ValidationError("Order must be at least 1")
        return value

class AnswerOptionSerializer(serializers.ModelSerializer):
    is_correct = serializers.BooleanField(read_only=True)  # Sử dụng property
    
    class Meta:
        model = AnswerOption
        fields = ['id', 'text', 'is_correct_bool', 'correct_order', 'order', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name', read_only=True)
    chapter_name = serializers.CharField(source='section.chapter.name', read_only=True)
    subject_name = serializers.CharField(source='section.chapter.subject.name', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    option_count = serializers.IntegerField(source='options.count', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'prompt', 'image', 'question_type', 'question_type_display',
            'section', 'section_name', 'chapter_name', 'subject_name',
            'option_count', 'created_at', 'is_active'
        ]

class QuestionDetailSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    chapter_name = serializers.CharField(source='section.chapter.name', read_only=True)
    subject_name = serializers.CharField(source='section.chapter.subject.name', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    has_multiple_correct_answers = serializers.SerializerMethodField()
    class Meta:
        model = Question
        fields = [
            'id', 'prompt', 'image', 'question_type', 'question_type_display',
            'correct_answer_text',
            'section', 'section_name', 'chapter_name', 'subject_name',
            'created_by', 'created_at', 'updated_at', 'is_active',
            'options', 'has_multiple_correct_answers'
        ]

    def get_has_multiple_correct_answers(self, obj):
        """Kiểm tra xem câu hỏi MC có nhiều đáp án đúng không"""
        if obj.question_type != 'MC':
            return False
        
        correct_count = obj.options.filter(is_correct_bool=True).count()
        return correct_count > 1
class QuestionCreateSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = [
            'section', 'question_type', 'prompt', 'image',
            'correct_answer_text', 'options'
        ]
    
    def validate_section(self, value):
        request = self.context.get('request')
        if request and value.chapter.subject.created_by != request.user:
            raise serializers.ValidationError("You don't have permission to add questions to this section.")
        return value
    
    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        
        for idx, option_data in enumerate(options_data):
            # Auto-set order if not provided
            if 'order' not in option_data:
                option_data['order'] = idx
            AnswerOption.objects.create(question=question, **option_data)
        
        return question