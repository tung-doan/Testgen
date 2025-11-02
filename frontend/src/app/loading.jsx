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
  message = "Đang tải dữ liệu...", 
  fullScreen = true,
  className = "",
  delay = 500 // Mặc định delay 500ms để tránh nháy màn hình với các thao tác nhanh
}) {
  // Trạng thái để kiểm soát việc hiển thị spinner sau delay
  const [showSpinner, setShowSpinner] = useState(false);
  
  useEffect(() => {
    // Chỉ hiển thị spinner sau một khoảng thời gian delay
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delay);
    
    // Cleanup timer khi component bị unmount
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Nếu chưa đến thời gian delay, không hiển thị gì cả
  if (!showSpinner) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          ${fullScreen ? 'fixed inset-0 z-50 bg-white/90 backdrop-blur-sm' : 'relative z-10'}
          flex items-center justify-center
          ${className}
        `}
      >
        <motion.div 
          className="flex flex-col items-center justify-center p-6 rounded-lg"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Loader2 className="w-10 h-10 animate-spin text-green-600" />
          {message && (
            <p className="mt-4 text-gray-700 text-lg font-medium">{message}</p>
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
export function ButtonLoader({ text = "Đang xử lý..." }) {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </>
  );
}