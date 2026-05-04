import dynamic from "next/dynamic";
import { FormSkeleton, ChartSkeleton } from "@/components/ui/skeletons";

/**
 * Dynamic Imports Registry
 *
 * Tập trung các component nặng cần lazy-load.
 * Mỗi component có loading fallback là skeleton phù hợp.
 *
 * Sử dụng: import { DynamicCameraScanner } from '@/lib/dynamic-imports';
 */

// CameraScanner - nặng, cần browser APIs (getUserMedia), không cần SSR
export const DynamicCameraScanner = dynamic(
  () => import("@/components/CameraScanner"),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);
