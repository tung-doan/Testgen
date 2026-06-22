import apiClient from "@/services/api-client";
import AuthService from "@/services/auth.service";

export const registerUser = async (email, username, password) => {
  try {
    const response = await apiClient.post(`users/register/`, {
      email,
      username,
      password,
    });
    return response.data;
  } catch (e) {
    throw new Error(e.response?.data?.detail || "Registration failed!");
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await apiClient.post(`users/login/`, {
      username,
      password,
    });
    return response.data;
  } catch (e) {
    throw new Error(e.response?.data?.detail || "Login failed!");
  }
};

export const loginStudent = async (identifier, password) => {
  try {
    const response = await AuthService.studentLogin(identifier, password);
    return response;
  } catch (e) {
    throw new Error(
      e.response?.data?.detail || e.message || "Student login failed!",
    );
  }
};

export const logoutUser = async () => {
  try {
    const response = await apiClient.post(`users/logout/`, {});
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    return { message: "Logged out locally" };
  }
};

export const getUserInfo = async () => {
  try {
    const response = await apiClient.get(`users/user-info/`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("User not authenticated");
    } else {
      console.error("Error getting user info:", error);
    }
    throw error;
  }
};

export const refreshToken = async () => {
  try {
    const response = await apiClient.post(`users/refresh/`, null);
    return response.data;
  } catch (e) {
    throw new Error("Refreshing token failed!");
  }
};

export const updateUserInfo = async (formData) => {
  try {
    const response = await apiClient.put(`users/user-info/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Update failed!");
  }
};

export const sendPasswordResetEmail = async (email) => {
  try {
    const response = await apiClient.post(`users/reset-password-email/`, {
      email,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
        error.response?.data?.email?.[0] ||
        "Failed to send reset email",
    );
  }
};

export const confirmPasswordReset = async (email, otp, newPassword) => {
  try {
    const response = await apiClient.post(`users/reset-password-confirm-api/`, {
      email,
      otp,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to reset password");
  }
};
