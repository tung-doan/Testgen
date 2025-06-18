"use client";
import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
export const AuthContext = createContext(null);
import {logoutUser, getUserInfo, refreshToken} from "../utils/auth.js";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);


  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const userData = await getUserInfo();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      if(error.response && error.response.status === 401) {
        clearAuth();
      }
      clearAuth()
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    refreshUser();
  }, []);


  return (
    <AuthContext.Provider value={{ user, setUser,refreshUser, loading, isAuthenticated, setIsAuthenticated, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
