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
  registerUser,
} from "@/utils/auth.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    async (username, password) => {
      try {
        setActionLoading(true);
        setAuthError(null);

        const response = await loginUser(username, password);

        await refreshUser();

        return response;
      } catch (error) {
        console.error("Login failed:", error);
        const errorMessage =
          error.message || "Login failed. Please check your credentials.";
        setAuthError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setActionLoading(false);
      }
    },
    [refreshUser]
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

      await logoutUser();
      clearAuth();

      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError(error.message || "Logout failed. Please try again.");

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
