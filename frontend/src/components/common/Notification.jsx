import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from "lucide-react";

/**
 * Common Notification component for showing success, error, warning, or info messages.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the notification
 * @param {string} props.message - The message to display
 * @param {string} props.type - The type of notification: 'success', 'error', 'warning', 'info'
 * @param {function} props.onClose - Function to call when closing
 * @param {number} props.duration - Duration in ms before auto-closing (default 3000)
 */
export default function Notification({
  show,
  message,
  type = "success",
  onClose,
  duration = 3000,
}) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
  };

  const textColors = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-amber-800",
    info: "text-blue-800",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 right-6 z-[9999] max-w-md pointer-events-auto"
        >
          <div
            className={`flex items-center p-4 rounded-xl border shadow-lg ${bgColors[type]} ${textColors[type]}`}
          >
            <div className="mr-3 shrink-0">{icons[type]}</div>
            <div className="mr-8 font-medium">{message}</div>
            <button
              onClick={onClose}
              className="ml-auto p-1 rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
