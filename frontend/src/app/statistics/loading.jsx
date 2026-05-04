import { ChartSkeleton, CardSkeleton } from "@/components/ui/skeletons";

export default function StatisticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header skeleton */}
      <div className="w-full bg-[#dfdfdf] py-6 shadow-md">
        <div className="container max-w-[1152px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-gray-300 rounded-lg animate-pulse" />
            <div className="h-6 w-24 bg-gray-300 rounded animate-pulse" />
          </div>
          <div className="flex gap-4 items-center">
            <div className="h-8 w-16 bg-gray-300 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-300 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-300 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Navbar skeleton */}
      <div className="w-full bg-[#302f2fd1] px-14 py-6">
        <div className="flex gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-600/30 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-white rounded-xl shadow-lg">
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}
