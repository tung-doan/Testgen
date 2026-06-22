import { ChartSkeleton, CardSkeleton } from "@/components/ui/skeletons";

export default function StatisticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header skeleton placeholder */}
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

      {/* Navbar skeleton placeholder */}
      <div className="w-full bg-[#302f2fd1] px-14 py-6">
        <div className="flex gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-600/30 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <div className="h-10 w-72 bg-gray-200 rounded-lg mx-auto animate-pulse mb-2" />
            <div className="h-5 w-56 bg-gray-100 rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6 bg-white/60 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
              <div className="h-[300px] bg-gray-100 rounded-lg" />
            </div>
            <div className="rounded-2xl p-6 bg-white/60 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
              <div className="h-[300px] bg-gray-100 rounded-lg" />
            </div>
          </div>
          <div className="rounded-2xl p-6 bg-white/60 animate-pulse">
            <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
            <div className="h-[300px] bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
