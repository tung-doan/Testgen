"use client";
import { createContext, useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";
export const AuthContext = createContext(null);
import { logoutUser, getUserInfo, refreshToken, loginUser, registerUser } from "@/utils/auth.js";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false); // For login/register/logout actions

  // Xóa thông tin xác thực
  const clearAuth = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null); // Đảm bảo xóa lỗi khi logout
  }, []);

  // Làm mới thông tin người dùng
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserInfo();
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError(null);
      return userData;
    } catch (error) {
      // Nếu lỗi 401 (Unauthorized), đơn giản là người dùng chưa đăng nhập
      // không cần hiển thị lỗi trong trường hợp này
      if (error.response && error.response.status === 401) {
        clearAuth();
        console.log("User not authenticated"); // Log thông tin, không phải lỗi
      } else {
        // Chỉ đặt lỗi cho các trường hợp khác không phải 401
        console.error("Error fetching user info:", error);
        setAuthError("Failed to load user information");
        clearAuth();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  // Đăng nhập
  const login = useCallback(async (username, password) => {
    try {
      setActionLoading(true);
      setAuthError(null);
      
      const response = await loginUser(username, password);
      
      // Refresh user info after successful login
      await refreshUser();
      
      return response;
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(error.message || "Login failed. Please check your credentials.");
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [refreshUser]);

  // Đăng ký
  const register = useCallback(async (userData) => {
    try {
      setActionLoading(true);
      setAuthError(null);
      
      const response = await registerUser(
        userData.email, 
        userData.username, 
        userData.password
      );
      
      return response;
    } catch (error) {
      console.error("Registration failed:", error);
      setAuthError(error.message || "Registration failed. Please try again.");
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, []);

  // Đăng xuất
  const logout = useCallback(async () => {
    try {
      setActionLoading(true);
      setAuthError(null);
      
      await logoutUser();
      clearAuth();
      
      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError(error.message || "Logout failed. Please try again.");
      
      // Still clear user data even if API call fails
      clearAuth();
      
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [clearAuth]);

  // Kiểm tra trạng thái xác thực khi component được mount
  useEffect(() => {
    refreshUser();
    
    // Optional: Setup token refresh interval
    // const refreshInterval = setInterval(async () => {
    //   try {
    //     await refreshToken();
    //   } catch (error) {
    //     console.error("Token refresh failed:", error);
    //     clearAuth();
    //   }
    // }, 15 * 60 * 1000); // e.g. every 15 minutes
    
    // return () => clearInterval(refreshInterval);
  }, [refreshUser]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        setUser,
        refreshUser, 
        loading,         // Overall loading state for initial auth check
        actionLoading,   // Loading state for specific actions (login, register, logout)
        isAuthenticated, 
        setIsAuthenticated, 
        clearAuth,
        authError,       // Authentication error message
        login,           // Login function
        logout,          // Logout function
        register         // Register function
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);