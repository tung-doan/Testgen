from rest_framework import serializers
from .models import Subject, Chapter, Section, Question, AnswerOption

class SubjectSerializer(serializers.ModelSerializer):
    chapter_count = serializers.IntegerField(source='chapters.count', read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'created_at', 'updated_at', 'chapter_count']
        read_only_fields = ['created_at', 'updated_at']

class ChapterSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    section_count = serializers.IntegerField(source='sections.count', read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'name', 'subject', 'subject_name', 'order', 'created_at', 'updated_at', 'section_count']
        read_only_fields = ['created_at', 'updated_at']
    
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
    question_count = serializers.IntegerField(source='questions.count', read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'chapter', 'chapter_name', 'subject_name', 'order', 'created_at', 'updated_at', 'question_count']
        read_only_fields = ['created_at', 'updated_at']
    
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
        fields = ['id', 'text', 'score_percentage', 'is_correct_bool', 'correct_order', 'order', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name', read_only=True)
    chapter_name = serializers.CharField(source='section.chapter.name', read_only=True)
    subject_name = serializers.CharField(source='section.chapter.subject.name', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    option_count = serializers.IntegerField(source='options.count', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'prompt', 'question_type', 'question_type_display', 'points',
            'section', 'section_name', 'chapter_name', 'subject_name',
            'option_count', 'created_at', 'is_active'
        ]

class QuestionDetailSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    chapter_name = serializers.CharField(source='section.chapter.name', read_only=True)
    subject_name = serializers.CharField(source='section.chapter.subject.name', read_only=True)
    question_type_display = serializers.CharField(source='get_question_type_display', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'prompt', 'question_type', 'question_type_display',
            'points', 'correct_answer_text',
            'section', 'section_name', 'chapter_name', 'subject_name',
            'created_by', 'created_at', 'updated_at', 'is_active',
            'options'
        ]

class QuestionCreateSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = [
            'section', 'question_type', 'prompt', 
            'points', 'correct_answer_text', 'options'
        ]
    
    def validate_section(self, value):
        request = self.context.get('request')
        if request and value.chapter.subject.created_by != request.user:
            raise serializers.ValidationError("You don't have permission to add questions to this section.")
        return value
    
    def validate_points(self, value):
        if value <= 0:
            raise serializers.ValidationError("Points must be greater than 0")
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