from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenRefreshView
from users.Serializers import *
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from .models import User 
from classrooms.models import Student
from django.core.mail import send_mail  
from django.http import Http404 
from django.contrib import messages 
from django.shortcuts import redirect  
from django.views.generic import DetailView
from rest_framework.renderers import JSONRenderer
from django.http import JsonResponse

ACCESS_TOKEN_MAX_AGE = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
REFRESH_TOKEN_MAX_AGE = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

class UserInfoView(APIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = customUserSerializer
    from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get(self, request):
        user = request.user
        # Fallback for Full Name if empty
        if not user.full_name:
            student = Student.objects.filter(user=user).first()
            if student:
                user.full_name = student.name
            else:
                user.full_name = user.username
            user.save(update_fields=['full_name'])
            
        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        
        # Validate Avatar Size
        avatar_file = request.FILES.get('avatar')
        if avatar_file:
            MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2MB
            if avatar_file.size > MAX_AVATAR_SIZE:
                return Response(
                    {"detail": "Avatar file size exceeds 2MB limit."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        serializer = self.serializer_class(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            
            # Synchronize full_name with Student name if student profile exists
            student = Student.objects.filter(user=user).first()
            if student and user.full_name:
                student.name = user.full_name
                student.save(update_fields=['name'])
                
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 
        
# View đăng ký
class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer
    authentication_classes = []    
    permission_classes = (AllowAny,)
    def post(self, request):
        print("Request data:", request.data)  # Debug log
        user = request.data
        serializer = self.serializer_class(data=user)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user_data = serializer.data
        return Response(user_data, status=status.HTTP_201_CREATED)

# View đăng nhập và tạo JWT
class LoginView(APIView):
    serializer_class = LoginSerializer
    authentication_classes = []    
    permission_classes = (AllowAny,)
    def post(self, request):
        serializers = self.serializer_class(data=request.data, context = {'request': request})
        if serializers.is_valid():
            username = request.data.get("username")
            user = serializers.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "date_of_birth": user.date_of_birth.strftime('%Y-%m-%d') if user.date_of_birth else None,
                "gender": user.gender,
                "avatar": user.avatar.url if user.avatar else None,
                "full_name": user.full_name,
                "is_student": False,
            }
            
            response = Response({
                "message": "Login successful",
                "user": user_data
            }, status=status.HTTP_200_OK)
            _secure = not settings.DEBUG
            _samesite = 'None' if _secure else 'Lax'
            response.set_cookie(key = 'access_token',
                                value = access_token,
                                httponly = True,
                                secure = _secure,
                                samesite = _samesite,
                                path = '/',
                                max_age = ACCESS_TOKEN_MAX_AGE
                                )
            response.set_cookie(key = 'refresh_token',
                                value = str(refresh),
                                httponly = True,
                                secure = _secure,
                                samesite = _samesite,
                                path = '/',
                                max_age = REFRESH_TOKEN_MAX_AGE
                                )
            return response
        return Response(serializers.errors, status = status.HTTP_400_BAD_REQUEST)
        # serializers.is_valid(raise_exception=True)
        # user = User.objects.get(username=serializers.validated_data['username'])
        # if user.is_authorized:
        #     response_data = serializers.data
        #     response_data["detail"] = 'Login successful'
        #     #Generate refresh token 
        #     refresh = RefreshToken.for_user(user)
        #     user.refresh_token = str(refresh)
        #     user.save()
            
        #     response = Response(response_data, status=status.HTTP_200_OK)
        #     response.set_cookie('refreshToken', user.refresh_token, secure=True, samesite='None')
        #     return response
        # else:
        #     return Response({"detail": "Account not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
class StudentLoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []

    def post(self, request):
        identifier = request.data.get("identifier")  # email or username
        password = request.data.get("password")
        if not identifier or not password:
            return Response({"detail": "Email/username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find user by email or username
        user = User.objects.filter(email=identifier).first()
        if not user:
            user = User.objects.filter(username=identifier).first()
        
        if not user:
            return Response({"detail": "Username/Email does not exist"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({"detail": "Incorrect password"}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if user has a student profile
        student = Student.objects.filter(user=user).first()
        if not student:
            return Response({"detail": "No student profile linked to this account"}, status=status.HTTP_401_UNAUTHORIZED)

        # Ensure full_name is populated from student name if blank
        if not user.full_name:
            user.full_name = student.name
            user.save(update_fields=['full_name'])

        refresh = RefreshToken.for_user(user)
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "date_of_birth": user.date_of_birth.strftime('%Y-%m-%d') if user.date_of_birth else None,
            "gender": user.gender,
            "avatar": user.avatar.url if user.avatar else None,
            "full_name": user.full_name,
            "is_student": True,
        }
        
        classrooms_data = [
            {
                'id': classroom.id,
                'name': classroom.name
            } for classroom in student.classrooms.all()
        ]
        
        student_data = {
            "id": student.id,
            "name": student.name,
            "student_id": student.student_id,
            "classrooms": classrooms_data,
        }
        
        response = Response({
            "message": "Login successful",
            "user": user_data,
            "student": student_data,
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }, status = status.HTTP_200_OK)

        _secure = not settings.DEBUG
        _samesite = 'None' if _secure else 'Lax'
        response.set_cookie(key='access_token', value=str(refresh.access_token), httponly=True, secure=_secure, samesite=_samesite, path='/')
        response.set_cookie(key='refresh_token', value=str(refresh), httponly=True, secure=_secure, samesite=_samesite, path='/')
        return response
class CookieTokenRefreshView(TokenRefreshView):
    authentication_classes = []
    permission_classes = [AllowAny]
    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({"detail": "No refresh token provided"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            response = Response({"access": access_token}, status=status.HTTP_200_OK)
            _secure = not settings.DEBUG
            _samesite = 'None' if _secure else 'Lax'
            response.set_cookie(key = 'access_token',
                                value = access_token,
                                httponly = True,
                                secure = _secure,
                                samesite = _samesite,
                                path = '/',
                                max_age = ACCESS_TOKEN_MAX_AGE
                                )
            return response
        except TokenError:
            return Response({"detail": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        
# class LogoutAPIView(generics.GenericAPIView):
#     permission_classes = (AllowAny,)
#     authentication_classes = []
#     renderer_classes = [JSONRenderer]
#     def post(self, request):
#         refresh_token = request.COOKIES.get('refresh_token')
#         if refresh_token:
#             try:
#                 refresh = RefreshToken(refresh_token)
#                 refresh.blacklist()
#             except Exception as e:
#                 return Response({"detail": "Invalid token" + str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
#         response = Response({"message": "Logout successful"}, status=status.HTTP_205_RESET_CONTENT)
#         print("Deleting access_token cookie")  # Debug log
#         response.delete_cookie( 'access_token',
#                                  path='/',
#                                 samesite='None',
#                                 secure=True,)
#         print("Deleting refresh_token cookie")  # Debug log
#         # response.delete_cookie('refresh_token', path='/')
#         response.delete_cookie( 'refresh_token',
#                                  path='/',
#                                 samesite='None',
#                                 secure=True,)
#         print("Response headers after deletion:", response.headers)  # Debug log
#         return response
            
            
class LogoutAPIView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except Exception as e:
                return Response({"detail": "Invalid token: " + str(e)}, status=status.HTTP_400_BAD_REQUEST)

        response = Response({"message": "Logout successful"}, status=status.HTTP_205_RESET_CONTENT)


        _secure = not settings.DEBUG
        _samesite = 'None' if _secure else 'Lax'
        response.set_cookie(
            key='access_token',
            value='',
            path='/',
            secure=_secure,
            httponly=True,
            samesite=_samesite,
            max_age=0,
        )
        response.set_cookie(
            key='refresh_token',
            value='',
            path='/',
            secure=_secure,
            httponly=True,
            samesite=_samesite,
            max_age=0,
        )

        return response


class PasswordResetOTPEmailView(generics.CreateAPIView):
    serializer_class = PasswordResetSerializer
    permission_classes = (AllowAny,)
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializers = self.serializer_class(data=request.data)
        serializers.is_valid(raise_exception=True)
        email = serializers.validated_data['email']
        data = serializers.save()
        
        confirmation_url_password_reset = f'http://localhost:3000/forgot-password?email={email}'
        
        #send an email with otp 
        subject = 'Password Reset OTP'
        message = f'Use this OTP to reset your password: {data["otp"]}\n\nAlternatively, you can reset your password directly at: {confirmation_url_password_reset}'
        
        from_email = 'testgen@gmail.com'
        recipient_list = [email]
        send_mail(subject, message, from_email, recipient_list)  # Use send_mail instead of send_email
        return Response({"message": "Password reset link sent"}, status=status.HTTP_200_OK)


class PasswordResetConfirmAPIView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []

    def post(self, request):
        from django.core.cache import cache
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not email or not otp or not new_password:
            return Response({"detail": "All fields (email, otp, new_password) are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Get OTP from Redis cache
        cached_otp = cache.get(f"password_reset_otp:{email}")
        if not cached_otp or cached_otp != otp:
            return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve user
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Update password
        user.set_password(new_password)
        user.save()

        # Delete the OTP from cache so it cannot be reused
        cache.delete(f"password_reset_otp:{email}")

        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
    
    
class PasswordResetConfirmView(generics.GenericAPIView):
    model = User 
    template_name = 'password_reset_confirm.html'
    context_object_name = 'user'
    
    def get_object(self, queryset=None):
        email = self.request.GET.get('email')
        otp = self.request.GET.get('otp')
        
        if not email or not otp:
            raise Http404("Invalid URL")
        
        user = User.objects.filter(email=email, login_token=otp).first()
        
        if user is None:
            raise Http404("Invalid OTP")
        
        return user
    
    def post(self, request, *args, **kwargs):
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        user.set_password(new_password)
        user.save()
        
        messages.success(request, "Password reset successfully")
        return redirect('Home:login')
    
    
class TokenLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        username = request.data.get('username')
        otp = request.data.get('token')

        user = User.objects.filter(username=username, login_token=otp).first()
        if not user:
            return Response({"message": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

        # clear OTP
        user.login_token = None
        user.save()

        # issue JWT
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response = Response({"message": "Login successful"}, status=status.HTTP_200_OK)
        _secure = not settings.DEBUG
        _samesite = 'None' if _secure else 'Lax'
        response.set_cookie('access_token', access_token, httponly=True, secure=_secure, samesite=_samesite, path='/')
        response.set_cookie('refresh_token', str(refresh), httponly=True, secure=_secure, samesite=_samesite, path='/')
        return response

        
class StudentRegisterView(APIView):
    """Student self-registration: creates User + Student profile"""
    authentication_classes = []
    permission_classes = (AllowAny,)

    def post(self, request):
        from users.Serializers import StudentRegisterSerializer
        
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        
        user = result['user']
        student = result['student']
        
        # Generate JWT tokens so student is logged in immediately
        refresh = RefreshToken.for_user(user)
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_student": True,
        }
        
        student_data = {
            "id": student.id,
            "name": student.name,
            "student_id": student.student_id,
            "classrooms": [],
        }
        
        response = Response({
            "message": "Registration successful",
            "user": user_data,
            "student": student_data,
        }, status=status.HTTP_201_CREATED)
        
        _secure = not settings.DEBUG
        _samesite = 'None' if _secure else 'Lax'
        response.set_cookie(
            key='access_token',
            value=str(refresh.access_token),
            httponly=True,
            secure=_secure,
            samesite=_samesite,
            path='/'
        )
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=_secure,
            samesite=_samesite,
            path='/'
        )
        
        return response