"use client";
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  logoutUser,
  getUserInfo,
  loginUser,
  loginStudent,
  registerUser,
  updateUserInfo,
} from "@/utils/auth.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("student");
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getUserInfo();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setIsAuthenticated(true);
      setAuthError(null);
      return userData;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        clearAuth();
        console.log("User not authenticated");
      } else {
        console.error("Error fetching user info:", error);
        setAuthError("Failed to load user information");
        clearAuth();
      }
      return null;
    }
  }, [clearAuth]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        // 1. Kiểm tra localStorage trước để hiển thị UI nhanh
        const storedUser = localStorage.getItem("user");
        let shouldValidateSession = false;
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setIsAuthenticated(true);
            shouldValidateSession = true;
          } catch (e) {
            console.error("Failed to parse stored user:", e);
            localStorage.removeItem("user");
          }
        }

        // 2. Luôn xác thực lại với server để đảm bảo session còn hạn
        if (shouldValidateSession) {
          await refreshUser();
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshUser]);

  const login = useCallback(
    async (credentials, isStudentLogin = false) => {
      try {
        setActionLoading(true);
        setAuthError(null);

        let response = null;

        if (isStudentLogin) {
          const { identifier, password } = credentials;
          if (!identifier || !password) {
            throw new Error("Please enter both email/username and password");
          }
          response = await loginStudent(identifier, password);
          if (response.student) {
            localStorage.setItem("student", JSON.stringify(response.student));
          }
        } else {
          const { username, password } = credentials;
          if (!username || !password) {
            throw new Error("Please fill in all fields");
          }
          response = await loginUser(username, password);
        }

        if (response && response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          setUser(response.user);
          setIsAuthenticated(true);
        }

        return response;
      } catch (error) {
        const errorMessage =
          error.message || "Login failed. Please check your credentials.";
        setAuthError(errorMessage);
        clearAuth();
        throw new Error(errorMessage);
      } finally {
        setActionLoading(false);
      }
    },
    [clearAuth]
  );

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
      const errorMessage =
        error.message || "Registration failed. Please try again.";
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setActionLoading(true);
      setAuthError(null);
      localStorage.removeItem("user");
      localStorage.removeItem("student");
      await logoutUser();
      clearAuth();

      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError(error.message || "Logout failed. Please try again.");
      localStorage.removeItem("user");
      localStorage.removeItem("student");
      clearAuth();

      return false;
    } finally {
      setActionLoading(false);
    }
  }, [clearAuth]);

  const updateProfile = useCallback(
    async (formData) => {
      try {
        setActionLoading(true);
        setAuthError(null);
        const response = await updateUserInfo(formData);
        
        // Update user state and localStorage
        const updatedUser = { ...user, ...response };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      } catch (error) {
        setAuthError(error.message || "Failed to update profile");
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [user]
  );

  const contextValue = {
    user,
    setUser,
    refreshUser,
    loading,
    actionLoading,
    isAuthenticated,
    setIsAuthenticated,
    clearAuth,
    authError,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
