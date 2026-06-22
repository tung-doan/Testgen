"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/**
 * LoadingScreen component với hiệu ứng transition mượt
 * Có thể sử dụng cho nhiều trường hợp loading khác nhau
 * 
 * @param {Object} props
 * @param {string} props.message - Thông điệp hiển thị
 * @param {boolean} props.fullScreen - Hiển thị dạng overlay toàn màn hình hoặc inline
 * @param {string} props.className - Classes CSS bổ sung
 * @param {number} props.delay - Thời gian delay trước khi hiển thị (ms), giúp tránh nháy với tác vụ nhanh
 */
export default function LoadingScreen({ 
  message = "Loading data...", 
  fullScreen = true,
  className = "",
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`
          ${fullScreen ? 'fixed inset-0 z-[9999] bg-[#f8fafc]/80 backdrop-blur-md' : 'relative z-10 w-full h-full'}
          flex items-center justify-center min-h-[200px]
          ${className}
        `}
      >
        <motion.div 
          className="flex flex-col items-center justify-center p-8 bg-white/60 shadow-xl rounded-2xl border border-white/40"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="relative flex items-center justify-center w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            <Loader2 className="w-8 h-8 text-emerald-600 animate-pulse" />
          </div>
          {message && (
            <p className="text-gray-700 text-lg font-semibold tracking-wide animate-pulse">{message}</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * InlineLoader - Component loading nhỏ gọn cho các phần UI nhỏ
 * 
 * @param {Object} props
 * @param {string} props.size - Kích thước: "small", "medium", "large"
 * @param {string} props.className - Classes CSS bổ sung
 */
export function InlineLoader({ size = "small", className = "" }) {
  const sizeClass = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8"
  }[size] || "w-4 h-4";
  
  return (
    <Loader2 className={`animate-spin text-green-600 ${sizeClass} ${className}`} />
  );
}

/**
 * ButtonLoader - Component loading cho nút
 * 
 * @param {Object} props
 * @param {string} props.text - Text hiển thị bên cạnh spinner
 */
export function ButtonLoader({ text = "Processing..." }) {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </>
  );
}