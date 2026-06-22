import { CardSkeleton } from "@/components/ui/skeletons";

export default function PendingLoading() {
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
            <div
              key={i}
              className="h-8 w-24 bg-gray-600/30 rounded animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="pt-16 pb-12 px-4 max-w-7xl mx-auto space-y-12">
        {/* Thin Page Header skeleton */}
        <div className="w-full shadow-xl border-0 rounded-xl overflow-hidden bg-white mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 flex justify-between items-center animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-lg" />
              <div>
                <div className="h-8 w-48 bg-white/20 rounded" />
                <div className="h-4 w-64 bg-white/10 rounded mt-2" />
              </div>
            </div>
            <div className="h-10 w-28 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Spacious Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
