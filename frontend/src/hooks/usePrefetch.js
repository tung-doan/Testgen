import { useRef, useCallback } from "react";

/**
 * usePrefetch - Hook để prefetch data khi hover
 *
 * Cơ chế:
 * - Khi user hover vào một link/row → gọi prefetch(key, fetchFn)
 * - Data được cache trong memory với TTL 30 giây
 * - Trang đích đọc cache bằng getCached(key) → render tức thì nếu có
 *
 * Ví dụ:
 * ```jsx
 * const { prefetch, getCached } = usePrefetch();
 *
 * // Trang danh sách - prefetch khi hover
 * <TableRow onMouseEnter={() => prefetch(`quiz-${id}`, () => getTestById(id))}>
 *
 * // Trang chi tiết - đọc cache
 * const cached = getCached(`quiz-${id}`);
 * if (cached) setData(cached); // Instant!
 * ```
 */

const prefetchCache = new Map();
const CACHE_TTL = 30_000; // 30 giây

export function usePrefetch() {
  const pendingRef = useRef(new Set());

  const prefetch = useCallback((key, fetchFn) => {
    // Bỏ qua nếu đã có cache hoặc đang fetch
    if (prefetchCache.has(key) || pendingRef.current.has(key)) return;

    pendingRef.current.add(key);

    fetchFn()
      .then((data) => {
        prefetchCache.set(key, { data, timestamp: Date.now() });
        // Tự xóa cache sau TTL
        setTimeout(() => prefetchCache.delete(key), CACHE_TTL);
      })
      .catch(() => {
        // Swallow errors - prefetch không nên gây crash
      })
      .finally(() => {
        pendingRef.current.delete(key);
      });
  }, []);

  const getCached = useCallback((key) => {
    const entry = prefetchCache.get(key);
    if (!entry) return null;

    // Kiểm tra hết hạn
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      prefetchCache.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  // Xóa một entry cụ thể khỏi cache
  const invalidate = useCallback((key) => {
    prefetchCache.delete(key);
  }, []);

  return { prefetch, getCached, invalidate };
}
