from rest_framework import serializers
from .models import Classroom, Test, Question, Submission, AnswerDetected, UserAnswer
from django.contrib.auth import get_user_model

User = get_user_model()


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'test', 'text', 'correct_answer', 'score']
        read_only_fields = ['test']

class QuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['text', 'correct_answer', 'score']

class TestSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all(), allow_null=True)
    questions = QuestionSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Test
        fields = ['id', 'title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'created_by', 'classroom', 'created_at', 'questions']

class TestCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True, required=False)
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Test
        fields = ['title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'classroom', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        test = Test.objects.create(**validated_data)
        for question_data in questions_data:
            Question.objects.create(test=test, **question_data)
        return test

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            instance.questions.all().delete()
            for question_data in questions_data:
                Question.objects.create(test=instance, **question_data)

        return instance

class AnswerDetectedSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=Question.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AnswerDetected
        fields = ['id', 'submission', 'question', 'is_correct', 'score', 'confidence']

class UserAnswerSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=Question.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = UserAnswer
        fields = ['id', 'submission', 'question', 'selected_option']

class SubmissionSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    test = serializers.PrimaryKeyRelatedField(queryset=Test.objects.all())
    answers = AnswerDetectedSerializer(many=True, read_only=True)
    user_answers = UserAnswerSerializer(many=True, read_only=True)
    submitted_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Submission
        fields = ['id', 'test', 'user', 'submission_image', 'submitted_at', 'total_score', 
                 'answers', 'user_answers']