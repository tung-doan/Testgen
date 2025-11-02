import apiClient from "./api-client";

const AuthService = {
  login: async (username, password) => {
    try {
      const response = await apiClient.post("users/login/", {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Login failed");
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post("users/register/", userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Registration failed");
    }
  },

  logout: async () => {
    try {
      const response = await apiClient.post("users/logout/");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      return { message: "Logged out locally" };
    }
  },

  getUserInfo: async () => {
    try {
      const response = await apiClient.get("users/user-info/");
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("User not authenticated");
      }
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const response = await apiClient.post("users/refresh/");
      return response.data;
    } catch (error) {
      throw new Error("Token refresh failed");
    }
  },
};

export default AuthService;
