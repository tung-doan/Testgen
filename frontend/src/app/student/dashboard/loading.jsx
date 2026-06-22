import { CardSkeleton } from "@/components/ui/skeletons";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
      <div className="py-8 px-4 max-w-7xl mx-auto space-y-6">
        {/* Welcome Header skeleton */}
        <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6 flex justify-between items-center">
            <div className="h-9 w-80 bg-white/20 rounded animate-pulse" />
            <div className="hidden md:block w-20 h-20 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Statistics Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 flex justify-between items-center border-0">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-10 w-16 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="w-14 h-14 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          {/* Pending Exams List skeleton */}
          <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100/50 rounded-lg animate-pulse" />
                <div>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-gray-100 rounded mt-1 animate-pulse" />
                </div>
              </div>
              <div className="w-8 h-6 bg-orange-100 rounded-full animate-pulse" />
            </div>
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse ml-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Score Trend Chart skeleton */}
          <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100/50 rounded-lg animate-pulse" />
                <div>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-gray-100 rounded mt-1 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-64 w-full bg-gray-50 flex items-end justify-between px-2 pb-2 gap-2">
                {[30, 45, 25, 60, 40, 70, 50].map((height, i) => (
                  <div key={i} className="w-full bg-gray-200 rounded-t-sm animate-pulse" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
