"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * NavigationProgress - Thanh progress bar phía trên cùng khi chuyển trang
 *
 * Cơ chế hoạt động:
 * 1. Lắng nghe click vào <a> nội bộ → bắt đầu progress
 * 2. Lắng nghe custom event "navigation-start" → bắt đầu progress (cho router.push)
 * 3. Khi pathname thay đổi (route đã load xong) → hoàn thành 100%
 * 4. Tự ẩn sau 300ms animation
 *
 * Các component khác có thể trigger bằng:
 *   window.dispatchEvent(new Event("navigation-start"));
 *   router.push("/target");
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathname = useRef(pathname);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Cleanup intervals/timeouts
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Hàm bắt đầu progress bar
  const startProgress = useCallback(() => {
    cleanup();
    setIsNavigating(true);
    setProgress(13);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return prev;
        }
        // Tăng chậm dần khi gần 90%
        const increment = Math.max(1, (90 - prev) * 0.1);
        return Math.min(90, prev + increment);
      });
    }, 300);
  }, [cleanup]);

  // Khi pathname thay đổi → navigation hoàn tất
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      // Hoàn thành progress bar
      cleanup();
      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);

      prevPathname.current = pathname;
    }

    return cleanup;
  }, [pathname, cleanup]);

  // Lắng nghe click vào <a> để bắt đầu progress
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href");

      // Bỏ qua: external links, hash links, trang hiện tại, download links
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("blob:") ||
        href === pathname ||
        link.hasAttribute("download") ||
        link.getAttribute("target") === "_blank"
      ) {
        return;
      }

      startProgress();
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, startProgress]);

  // Lắng nghe custom event cho programmatic navigation (router.push)
  useEffect(() => {
    const handleNavStart = () => {
      startProgress();
    };

    const handleNavEnd = () => {
      cleanup();
      setProgress(100);
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
    };

    window.addEventListener("navigation-start", handleNavStart);
    window.addEventListener("navigation-end", handleNavEnd);
    return () => {
      window.removeEventListener("navigation-start", handleNavStart);
      window.removeEventListener("navigation-end", handleNavEnd);
    };
  }, [startProgress, cleanup]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background:
                "linear-gradient(90deg, #4ade80, #10b981, #059669)",
              boxShadow: "0 0 10px rgba(0, 214, 54, 0.7)",
              width: `${progress}%`,
              transition: "width 0.3s ease-out",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
