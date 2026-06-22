import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { TableSkeleton } from "@/components/ui/skeletons";

export default function QuizDetailLoading() {
  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header Card Skeleton */}
          <div className="rounded-xl overflow-hidden shadow-xl bg-white mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-8 w-64 bg-white/20 rounded animate-pulse mb-3" />
                  <div className="h-4 w-40 bg-white/20 rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-36 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          {/* Table Skeleton */}
          <div className="rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="p-6 pb-0">
              <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-6" />
            </div>
            <TableSkeleton rows={10} cols={6} />
          </div>
        </div>
      </div>
    </>
  );
}
