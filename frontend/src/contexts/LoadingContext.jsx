"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

/**
 * LoadingContext - Quản lý trạng thái loading toàn cục
 *
 * Đếm số lượng request đang active thay vì dùng boolean.
 * Cơ chế: mỗi request bắt đầu → +1, kết thúc → -1.
 * isLoading = true khi có ít nhất 1 request đang chạy.
 */

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
