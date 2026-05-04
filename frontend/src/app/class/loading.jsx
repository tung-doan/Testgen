import { TableSkeleton } from "@/components/ui/skeletons";

export default function ClassLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200">
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
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-5xl shadow-xl border-0 rounded-xl overflow-hidden bg-white">
          {/* Card Header skeleton - blue gradient */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-lg px-8 py-5 flex justify-between items-center">
            <div className="h-7 w-40 bg-white/20 rounded animate-pulse" />
            <div className="h-10 w-36 bg-white/20 rounded-lg animate-pulse" />
          </div>
          {/* Table skeleton */}
          <div className="p-6">
            <TableSkeleton rows={5} cols={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
