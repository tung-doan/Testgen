from rest_framework import serializers
from .models import Classroom, PaperTest, PaperTestQuestion, PaperSubmission, PaperAnswerDetected, PaperUserAnswer
from django.contrib.auth import get_user_model

User = get_user_model()


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperTestQuestion
        fields = ['id', 'test', 'text', 'correct_answer', 'score']
        read_only_fields = ['test']

class QuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperTestQuestion
        fields = ['text', 'correct_answer', 'score']

class TestSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all(), allow_null=True)
    questions = QuestionSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = PaperTest
        fields = ['id', 'title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'created_by', 'classroom', 'created_at', 'questions']

class TestCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True, required=False)
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all(), allow_null=True, required=False)

    class Meta:
        model = PaperTest
        fields = ['title', 'description', 'num_questions', 'num_choices', 
                 'allow_multiple_answers', 'classroom', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        test = PaperTest.objects.create(**validated_data)
        for question_data in questions_data:
            PaperTestQuestion.objects.create(test=test, **question_data)
        return test

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            instance.questions.all().delete()
            for question_data in questions_data:
                PaperTestQuestion.objects.create(test=instance, **question_data)

        return instance

class AnswerDetectedSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=PaperTestQuestion.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PaperAnswerDetected
        fields = ['id', 'submission', 'question', 'is_correct', 'score', 'confidence']

class UserAnswerSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=PaperTestQuestion.objects.all())
    submission = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PaperUserAnswer
        fields = ['id', 'submission', 'question', 'selected_option']

# class SubmissionSerializer(serializers.ModelSerializer):
#     user = serializers.PrimaryKeyRelatedField(read_only=True)
#     test = serializers.PrimaryKeyRelatedField(queryset=Test.objects.all())
#     answers = AnswerDetectedSerializer(many=True, read_only=True)
#     user_answers = UserAnswerSerializer(many=True, read_only=True)
#     submitted_at = serializers.DateTimeField(read_only=True)

#     class Meta:
#         model = Submission
#         fields = ['id', 'test', 'user', 'submission_image', 'submitted_at', 'total_score', 
#                  'answers', 'user_answers']

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