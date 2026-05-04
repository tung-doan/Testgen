import { TableSkeleton } from "@/components/ui/skeletons";

export default function QuizLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200">
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

      {/* Navbar skeleton */}
      <div className="w-full bg-[#302f2fd1] px-14 py-6">
        <div className="flex gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-600/30 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-7xl shadow-2xl border-0 rounded-xl overflow-hidden bg-white">
          {/* Card Header skeleton */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-xl px-8 py-5 flex justify-between items-center">
            <div>
              <div className="h-7 w-40 bg-white/20 rounded animate-pulse" />
              <div className="h-4 w-64 bg-white/10 rounded mt-2 animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
          </div>
          {/* Table skeleton */}
          <TableSkeleton rows={8} cols={6} />
        </div>
      </div>
    </div>
  );
}
