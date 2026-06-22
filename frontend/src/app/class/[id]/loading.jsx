import { TableSkeleton } from "@/components/ui/skeletons";
import { Users, TrendingUp, Award, FileText } from "lucide-react";

export default function ClassDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
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
          {/* Page Header Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-4 rounded-xl border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-9 w-48 bg-white/20 rounded animate-pulse mb-2" />
                  <div className="h-5 w-64 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-40 bg-white/20 rounded-md animate-pulse" />
                  <div className="h-10 w-40 bg-white/20 rounded-md animate-pulse shadow-lg" />
                </div>
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            {[
              { label: "Total Students", icon: Users, color: "blue" },
              { label: "Class Average", icon: TrendingUp, color: "emerald" },
              { label: "Top Score", icon: Award, color: "amber" },
              { label: "Active Tests", icon: FileText, color: "purple" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border-0 shadow-lg bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <div className="h-9 w-16 bg-gray-100 animate-pulse rounded-md mt-1" />
                  </div>
                  <div className={`bg-${stat.color}-100 p-3 rounded-full`}>
                    <stat.icon className={`h-8 w-8 text-${stat.color}-600 opacity-50`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Students Table Skeleton */}
          <div className="rounded-xl border-0 shadow-xl bg-white mt-4 overflow-hidden">
            <div className="border-b bg-gradient-to-r from-gray-50 to-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg">
                    <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <TableSkeleton rows={8} cols={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
