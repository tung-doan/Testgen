from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from django.contrib import auth
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from .models import User
from django.utils.crypto import get_random_string
from api.settings import default_error_messages 

class customUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'date_of_birth', 'gender', 'email')  # Include the password field in the serializer
        extra_kwargs = {
            'password': {'write_only': True}
        }


# class RegisterSerializer(ModelSerializer):
#     # password = serializers.CharField(write_only=True)  # Define a plain password field for input
#    # password = serializers.CharField(max_length = 150)  # Define a plain password field for input
   
#    class Meta:
#         model = User
#         fields = ('username', 'date_of_birth', 'gender', 'email', 'password')  # Include the password field in the serializer
#         extra_kwargs = {
#             'password': {'write_only': True}
#     }
    
#     def create(self, validated_data):
#         user = User.objects.create_user(**validated_data)
        
        
    # def validate(self, attrs):
    #     email = attrs.get('email', '')
    #     username = attrs.get('username', '')
    #     if not username.isalnum():
    #         raise serializers.ValidationError(self.default_error_messages)
    #     return attrs

    # def create(self, validated_data):
    #     # Mã hóa mật khẩu bằng bcrypt
    #     user = User.objects.create_user(
    #         username=validated_data['username'],
    #         email=validated_data['email'],
    #         date_of_birth=validated_data['date_of_birth'],
    #         gender=validated_data['gender'],
    #     )
    #     user.set_password(validated_data['password'])
    #     user.save()
    #     return user


class RegisterSerializer(ModelSerializer):
    password = serializers.CharField(max_length=150, write_only=True)
    confirm_password = serializers.CharField(max_length=150, write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'date_of_birth', 'gender', 'email', 'password', 'confirm_password')
        extra_kwargs = {
            'password': {'write_only': True},
            'confirm_password': {'write_only': True}
        }
    
    def validate(self, attrs):
        email = attrs.get('email', '')
        username = attrs.get('username', '')
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        # Validate username
        if not username.isalnum():
            raise serializers.ValidationError({
                'username': default_error_messages.get('invalid username', 'Username must be alphanumeric')
            })
        
        # Validate email
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'Email already exists'
            })
        
        # Validate username uniqueness
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                'username': 'Username already exists'
            })
        
        # Validate password match
        if password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match'
            })
        
        # Validate password strength (optional)
        if len(password) < 6:
            raise serializers.ValidationError({
                'password': 'Password must be at least 6 characters long'
            })
        
        return attrs

    def create(self, validated_data):
        # Remove confirm_password before creating user
        validated_data.pop('confirm_password', None)
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            date_of_birth=validated_data.get('date_of_birth'),
            gender=validated_data.get('gender'),
        )
        user.set_password(validated_data['password'])
        user.is_authorized = True  # Auto-authorize user (or set to False if you want manual approval)
        user.save()
        return user
    

class LoginSerializer(serializers.ModelSerializer):
    password = serializers.CharField(max_length=150, write_only=True)  # Define a plain password field for input
    username = serializers.CharField(max_length=255, write_only=True)  # Define a plain username field for input
    tokens = serializers.SerializerMethodField()
    
    def get_tokens(self, obj):
        user = User.objects.get(username=obj['username'])
        return user.tokens()
    
    class Meta:
        model = User
        fields = ('password', 'username', 'tokens')  # Include the password field in the serializer

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        # Check if user exists
        user_exists = User.objects.filter(username=username).exists()
        if not user_exists:
            raise AuthenticationFailed('Username does not exist')
            
        user = authenticate(**data)
        if user is None:
           raise AuthenticationFailed('Incorrect password')
       
        if not user.is_active:
            raise AuthenticationFailed('Account disabled, contact admin')

        if not user.is_authorized:
            raise AuthenticationFailed('Account not authorized, contact admin')
        return user
        
        
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
    
    default_error_messages = {
        'bad_token': ('Token is invalid or expired')
    }
    
    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs
    
    def save(self, **kwargs):
        try:
            RefreshToken(self.token).blacklist()
        except TokenError as e:
            raise serializers.ValidationError(str(e))
        
        
class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        user = User.objects.filter(email=value).first()
        if user is None:
            raise serializers.ValidationError("Email not found.")
        return value
    
    def save(self):
        email = self.validated_data['email']
        user = User.objects.get(email=email)
        otp = get_random_string(length=6, allowed_chars='0123456789')
        user.login_token = otp
        user.save()
        return {'user':user, 'otp': otp}
        
class UserSerializer(serializers.ModelSerializer):
    is_student = serializers.SerializerMethodField()
    student_info = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_student', 'student_info']
    
    def get_is_student(self, obj):
        """Check if user is a student"""
        return hasattr(obj, 'student_profile') and obj.student_profile is not None
    
    def get_student_info(self, obj):
        if hasattr(obj, 'student_profile') and obj.student_profile:
            student = obj.student_profile
            classrooms_data = [
                {
                    'id': classroom.id,
                    'name': classroom.name
                } for classroom in student.classrooms.all()
            ]
            
            return {
                "id": student.id,
                "name": student.name,
                "student_id": student.student_id,
                "classrooms": classrooms_data,
            }
        return None


class StudentRegisterSerializer(serializers.Serializer):
    """Serializer for student self-registration - creates User + Student"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=150, write_only=True)
    confirm_password = serializers.CharField(max_length=150, write_only=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    name = serializers.CharField(max_length=100)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        username = attrs.get('username')
        email = attrs.get('email')
        
        if password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match'
            })
        
        if len(password) < 6:
            raise serializers.ValidationError({
                'password': 'Password must be at least 6 characters long'
            })
        
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                'username': 'Username already exists'
            })
        
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'Email already exists'
            })
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        name = validated_data.pop('name')
        date_of_birth = validated_data.pop('date_of_birth', None)
        
        # Create User
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            date_of_birth=date_of_birth,
        )
        user.set_password(validated_data['password'])
        user.is_authorized = True
        user.save()
        
        # Auto-generate student_id
        student_id = f"STU_{user.id:06d}"
        
        # Create linked Student profile
        from classrooms.models import Student
        student = Student.objects.create(
            name=name,
            student_id=student_id,
            user=user,
        )
        
        return {
            'user': user,
            'student': student,
        }