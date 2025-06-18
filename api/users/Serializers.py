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
    class Meta:
        model = User
        fields = ('username', 'date_of_birth', 'gender', 'email', 'password')  # Include the password field in the serializer
        extra_kwargs = {
            'password': {'write_only': True}
    }
    
    def validate(self, attrs):
        email = attrs.get('email', '')
        username = attrs.get('username', '')
        if not username.isalnum():
            raise serializers.ValidationError(default_error_messages['invalid_username'])
        return attrs

    def create(self, validated_data):
        # Mã hóa mật khẩu bằng bcrypt
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            date_of_birth=validated_data['date_of_birth'],
            gender=validated_data['gender'],
        )
        user.set_password(validated_data['password'])
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
        user = authenticate(**data)
        if user is None:
           raise AuthenticationFailed('Invalid Password, try again')
       
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
        