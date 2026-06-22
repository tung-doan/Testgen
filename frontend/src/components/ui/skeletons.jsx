"use client";

import { motion } from "framer-motion";

/**
 * Skeleton Components Library
 *
 * Thay thế spinner/text "Loading..." bằng các skeleton phù hợp cấu trúc trang.
 * Giảm CLS (Cumulative Layout Shift) và cải thiện perceived performance.
 */

// ============================================
// BASE: Hiệu ứng shimmer chạy ngang
// ============================================
const shimmerVariants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
  },
};

function SkeletonPulse({ className = "", style = {}, ...props }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-md ${className}`}
      style={style}
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      {...props}
    />
  );
}

// ============================================
// TABLE SKELETON - Cho trang quiz, class, question-bank
// ============================================
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex gap-4 p-4 border-b border-gray-200 bg-gray-50/80">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={`head-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={`row-${row}`}
          className={`flex gap-4 p-4 border-b border-gray-100 ${
            row % 2 === 0 ? "bg-white" : "bg-gray-50/30"
          }`}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonPulse key={`cell-${row}-${col}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================
// CARD SKELETON - Cho trang chi tiết quiz/[id], class/[id]
// ============================================
export function CardSkeleton() {
  return (
    <div className="rounded-xl border shadow-lg overflow-hidden bg-white">
      <SkeletonPulse className="h-16 rounded-none" />
      <div className="p-6 space-y-4">
        <SkeletonPulse className="h-6 w-2/3" />
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-5/6" />
        <SkeletonPulse className="h-4 w-3/4" />
        <div className="flex gap-3 pt-4">
          <SkeletonPulse className="h-10 w-24 rounded-lg" />
          <SkeletonPulse className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// FORM SKELETON - Cho trang create-test
// ============================================
export function FormSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <SkeletonPulse className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <SkeletonPulse className="h-12 w-40 rounded-lg" />
    </div>
  );
}

// ============================================
// CHART SKELETON - Cho trang statistics
// ============================================
export function ChartSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <SkeletonPulse className="h-6 w-40" />
      <div className="flex items-end gap-2 h-48">
        {[45, 72, 33, 85, 60, 40, 78, 55].map((height, i) => (
          <SkeletonPulse
            key={`bar-${i}`}
            className="flex-1 rounded-t-md"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// HEADER SKELETON - Thay thế full-screen LoadingScreen trong Header
// ============================================
export function HeaderSkeleton() {
  return (
    <header className="w-full bg-[#dfdfdf] py-6 shadow-md">
      <div className="container max-w-[1152px] mx-auto flex justify-between items-center"
      suppressHydrationWarning={true}>
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-12 h-12 rounded-lg" />
          <SkeletonPulse className="h-6 w-24" />
        </div>
        <div className="flex gap-4 items-center">
          <SkeletonPulse className="h-8 w-16" />
          <SkeletonPulse className="h-8 w-20" />
          <SkeletonPulse className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </header>
  );
}
// ============================================
// LOGIN SKELETON - Cho trang login, student-login
// ============================================
export function LoginSkeleton() {
  return (
    <div className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0">
      <div className="text-center mb-8 flex flex-col items-center">
        <SkeletonPulse className="w-20 h-20 rounded-full mb-4" />
        <SkeletonPulse className="h-10 w-48 mb-2" />
        <SkeletonPulse className="h-4 w-64" />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-12 w-full rounded-lg" />
        </div>
        <SkeletonPulse className="h-12 w-full rounded-lg mt-6" />
        <div className="pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
