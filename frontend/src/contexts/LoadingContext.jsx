"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { wireLoadingInterceptors } from "@/services/api-client";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const countRef = useRef(0);

  const startLoading = useCallback(() => {
    countRef.current += 1;
    setActiveRequests(countRef.current);
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setActiveRequests(countRef.current);
  }, []);

  // Kết nối interceptors với apiClient
  useEffect(() => {
    wireLoadingInterceptors(startLoading, stopLoading);
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: activeRequests > 0,
        activeRequests,
        startLoading,
        stopLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export const useGlobalLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useGlobalLoading must be used within LoadingProvider");
  }
  return ctx;
};
