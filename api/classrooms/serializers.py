from rest_framework import serializers
from .models import Classroom, Student, EnrollmentRequest
from exam.models import PaperSubmission
class StudentSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    student_id = serializers.CharField()
    classrooms = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    classroom_names = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    average_score = serializers.SerializerMethodField()
    password = serializers.CharField(
        write_only=True, 
        required=True,
        allow_blank=False,
        min_length=6,  # Add minimum length validation
        help_text="Password must be at least 6 characters"
    )
    avatar = serializers.SerializerMethodField()
    class Meta:
        model = Student
        fields = [
            'id', 'name', 'student_id', 'classrooms', 'classroom_names', 
            'date_of_birth', 'average_score', 'created_at', 'password', 'avatar'
        ]
        read_only_fields = ['average_score', 'created_at', 'classrooms']
        
    def get_classroom_names(self, obj):
        return [classroom.name for classroom in obj.classrooms.all()]

    def get_avatar(self, obj):
        if obj.user and obj.user.avatar:
            return obj.user.avatar.url
        return None

    def get_average_score(self, obj):
        classroom_id = self.context.get('classroom_id')
        if classroom_id:
            return obj.get_classroom_average_score(classroom_id)
        return obj.average_score

    def validate(self, data):
        # Kiểm tra student_id duy nhất
        student_id = data.get('student_id')
        instance_id = self.instance.id if self.instance else None
        
        if student_id:
            existing = Student.objects.filter(student_id=student_id)
            if instance_id:
                existing = existing.exclude(id=instance_id)
            if existing.exists():
                raise serializers.ValidationError({"student_id": "Student ID must be unique."})
        
        # Validate password khi tạo mới
        if self.instance is None:
            password = data.get('password')
            if not password:
                raise serializers.ValidationError({"password": "Password is required when creating a student."})
            if len(password) < 6:
                raise serializers.ValidationError({"password": "Password must be at least 6 characters long."})
        
        return data
    
    def create(self, validated_data):
        pwd = validated_data.pop('password')
        date_of_birth = validated_data.pop('date_of_birth', None)
        student = Student.objects.create(**validated_data)
        student.create_user_account(raw_password=pwd, date_of_birth=date_of_birth)
        return student

    def update(self, instance, validated_data):
        pwd = validated_data.pop('password', None)
        date_of_birth = validated_data.pop('date_of_birth', None)
        
        # Update các trường thông thường
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update user account nếu cần
        if pwd is not None or date_of_birth is not None:
            instance.create_user_account(raw_password=pwd, date_of_birth=date_of_birth)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.user and instance.user.date_of_birth:
            data['date_of_birth'] = instance.user.date_of_birth
        else:
            data['date_of_birth'] = None
            
        if instance.user and instance.user.email:
            data['email'] = instance.user.email
        else:
            data['email'] = 'N/A'
        return data

class ClassroomSerializer(serializers.ModelSerializer):
    teacher = serializers.CharField(source='teacher.username', default="N/A", read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description', 'teacher', 'student_count', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()

class ClassroomCreateSerializer(serializers.ModelSerializer):
    teacher = serializers.CharField(source='teacher.username', required=False, allow_null=True)

    class Meta:
        model = Classroom
        fields = ['name', 'description', 'teacher']


class AllClassroomSerializer(serializers.ModelSerializer):
    """Serializer for students to browse all available classrooms"""
    teacher_name = serializers.CharField(source='teacher.username', default="N/A", read_only=True)
    teacher_email = serializers.CharField(source='teacher.email', default="N/A", read_only=True)
    teacher_avatar = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description', 'teacher_name', 'teacher_email', 'teacher_avatar', 'student_count', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()

    def get_teacher_avatar(self, obj):
        if obj.teacher and obj.teacher.avatar:
            return obj.teacher.avatar.url
        return None


class EnrollmentRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id_code = serializers.CharField(source='student.student_id', read_only=True)
    student_email = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    request_type = serializers.CharField(read_only=True)
    invited_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'student', 'classroom', 'status', 'request_type',
            'student_name', 'student_id_code', 'student_email',
            'classroom_name', 'invited_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']
    
    def get_student_email(self, obj):
        if obj.student.user:
            return obj.student.user.email
        return None

    def get_invited_by_name(self, obj):
        if obj.invited_by:
            return obj.invited_by.username
        return None


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for student-side invitation display"""
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_description = serializers.CharField(source='classroom.description', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    teacher_email = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'classroom', 'classroom_name', 'classroom_description',
            'teacher_name', 'teacher_email', 'status', 'created_at'
        ]
        read_only_fields = ['status', 'created_at']

    def get_teacher_name(self, obj):
        if obj.classroom.teacher:
            return obj.classroom.teacher.username
        return 'N/A'

    def get_teacher_email(self, obj):
        if obj.classroom.teacher:
            return obj.classroom.teacher.email or 'N/A'
        return 'N/A'


class EnrollmentRequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])