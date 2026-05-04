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
  refreshToken,
  loginUser,
  loginStudent,
  registerUser,
} from "@/utils/auth.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      setLoading(true);

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        clearAuth();
        return;
      }

      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Auth check failed:", err);
      clearAuth();
      localStorage.removeItem("user");
      localStorage.removeItem("student");
    } finally {
      setLoading(false);
    }
  };

  const clearAuth = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserInfo();
      setUser(userData);
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
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const login = useCallback(
    async (credentials, isStudentLogin = false) => {
      try {
        setActionLoading(true);
        setAuthError(null);

        let response = null;

        if (isStudentLogin) {
          // Student login - Use loginStudent service
          const { identifier, password } = credentials;

          if (!identifier || !password) {
            throw new Error("Please enter both email/username and password");
          }

          // Call loginStudent from utils/auth.js
          response = await loginStudent(identifier, password);

          // Store student info
          if (response.student) {
            localStorage.setItem("student", JSON.stringify(response.student));
          }
        } else {
          // ✅ Teacher login - Use loginUser service
          const { username, password } = credentials;

          if (!username || !password) {
            throw new Error("Please fill in all fields");
          }

          // ✅ Call loginUser from utils/auth.js
          response = await loginUser(username, password);
        }

        // ✅ Store user data for both teacher and student
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

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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
