import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
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
        {/* Page Header skeleton */}
        <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white mb-4">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-lg animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-64 bg-white/10 rounded mt-2 animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-28 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Exam List skeleton */}
        <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-full md:w-64 bg-white rounded-md border border-gray-200 animate-pulse" />
              <div className="h-9 w-24 bg-white rounded-md border border-gray-200 animate-pulse" />
            </div>
          </div>
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
