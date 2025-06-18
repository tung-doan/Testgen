"""
URL configuration for api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from django.urls import include
from users.views import *

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/",  LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('reset-password-email/', PasswordResetOTPEmailView.as_view(), name='reset_password_email'),
    path('reset-password-confirm/', PasswordResetConfirmView.as_view(), name='reset_password_confirm'),
    path('user-info/', UserInfoView.as_view(), name='user_info'),
    path('refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    # path("auth/", include("users.urls"), name="auth"),
    # path("auth/<str:provider>/", include("users.urls"), name="auth_provider")
]
