from rest_framework import serializers
from .models import Classroom, Student
from exam.models import PaperSubmission
class StudentSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    student_id = serializers.CharField()
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all())
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    average_score = serializers.FloatField(read_only=True)
    password = serializers.CharField(
        write_only=True, 
        required=True,
        allow_blank=False,
        min_length=6,  # Add minimum length validation
        help_text="Password must be at least 6 characters"
    )
    class Meta:
        model = Student
        fields = ['id', 'name', 'student_id', 'classroom', 'date_of_birth', 'average_score', 'created_at', 'password']
        read_only_fields = ['average_score', 'created_at']

    def validate(self, data):
        # Kiểm tra rằng student_id là duy nhất
        student_id = data.get('student_id')
        if student_id and Student.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError({"student_id": "Student ID must be unique."})
        
        if self.instance is None:  # Only on create
            password = data.get('password')
            if not password:
                raise serializers.ValidationError({"password": "Password is required when creating a student."})
            if len(password) < 6:
                raise serializers.ValidationError({"password": "Password must be at least 6 characters long."})
        
        return data
    
    def create(self, validated_data):
        pwd = validated_data.pop('password')
        date_of_birth = validated_data.pop('date_of_birth', None)
        student = super().create(validated_data)
        student.create_user_account(raw_password=pwd, date_of_birth=date_of_birth)
        
        return student

    def update(self, instance, validated_data):
        pwd = validated_data.pop('password', None)
        date_of_birth = validated_data.pop('date_of_birth', None)
        student = super().update(instance, validated_data)
        if pwd is not None or date_of_birth is not None:
            student.create_user_account(raw_password=pwd, date_of_birth=date_of_birth)
        
        return student
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.user and instance.user.date_of_birth:
            data['date_of_birth'] = instance.user.date_of_birth
        else:
            data['date_of_birth'] = None
        return data

class ClassroomSerializer(serializers.ModelSerializer):
    teacher = serializers.CharField(source='teacher.username', default="N/A", read_only=True)

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description', 'teacher', 'created_at']

class ClassroomCreateSerializer(serializers.ModelSerializer):
    teacher = serializers.CharField(source='teacher.username', required=False, allow_null=True)

    class Meta:
        model = Classroom
        fields = ['name', 'description', 'teacher']