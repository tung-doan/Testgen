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
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-0 border overflow-hidden mt-6">
          <div className="h-16 bg-gradient-to-r from-gray-50 to-gray-100 border-b opacity-50"></div>
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
