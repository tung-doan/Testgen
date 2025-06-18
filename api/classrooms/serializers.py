from rest_framework import serializers
from .models import Classroom, Student
from exam.models import Submission

class StudentSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    student_id = serializers.CharField()
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all())
    date_of_birth = serializers.DateField(allow_null=True)
    average_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'name', 'student_id', 'classroom', 'date_of_birth', 'average_score', 'created_at']

    def validate(self, data):
        # Kiểm tra rằng student_id là duy nhất
        student_id = data.get('student_id')
        if student_id and Student.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError({"student_id": "Student ID must be unique."})
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