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
from .models import User  # Giả sử bạn sử dụng model User tùy chỉnh
from django.core.mail import send_mail  # Import send_mail for sending emails
from django.http import Http404  # Import Http404 for raising 404 errors
from django.contrib import messages  # Import messages for displaying success messages
from django.shortcuts import redirect  # Import redirect for redirecting users
from django.views.generic import DetailView
from rest_framework.renderers import JSONRenderer
from django.http import JsonResponse

class UserInfoView(APIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = customUserSerializer
    # def get_object(self):
    #     return self.request.user   
    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            # hoặc serialize user nếu muốn
        }) 
        
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
            user = serializers.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response = Response({
                "user": customUserSerializer(user).data},
                status = status.HTTP_200_OK
            )
            response.set_cookie(key = 'access_token',
                                value = access_token,
                                httponly = True,
                                secure = True,
                                samesite = 'None'
                                )
            response.set_cookie(key = 'refresh_token',
                                value = str(refresh),
                                httponly = True,
                                secure = True,
                                samesite = 'None'
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
            response.set_cookie(key = 'access_token',
                                value = access_token,
                                httponly = True,
                                secure = True,
                                samesite = 'None'
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


        response.set_cookie(
            key='access_token',
            value='',
            path='/',
            secure=True,
            httponly=True,
            samesite='None',
        )
        response.set_cookie(
            key='refresh_token',
            value='',
            path='/',
            secure=True,
            httponly=True,
            samesite='None',
        )

        return response


class PasswordResetOTPEmailView(generics.CreateAPIView):
    serializer_class = PasswordResetSerializer

    def create(self, request, *args, **kwargs):
        serializers = self.serializer_class(data=request.data)
        serializers.is_valid(raise_exception=True)
        email = serializers.validated_data['email']
        data = serializers.save()
        
        confirmation_url_password_reset = f'http://localhost8000/reset-password-confirm/?email={email}'
        
        #send an email with otp 
        subject = 'Password Reset OTP and Confirmation Link'
        message = f'Use this OTP to reset your password: {data["otp"]} and click on this link to reset your password: {confirmation_url_password_reset}'
        message += f'Alternatively you can click here to reset your password: {confirmation_url_password_reset}'
        
        from_email = 'testgen@gmail.com'
        recipient_list = [email]
        send_mail(subject, message, from_email, recipient_list)  # Use send_mail instead of send_email
        return Response({"message": "Password reset link sent"}, status=status.HTTP_200_OK)
    
    
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
        response.set_cookie('access_token', access_token, httponly=True, secure=True, samesite='None')
        response.set_cookie('refresh_token', str(refresh), httponly=True, secure=True, samesite='None')
        return response

        