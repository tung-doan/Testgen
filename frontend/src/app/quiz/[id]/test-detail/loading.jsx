import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function TestDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-xl overflow-hidden shadow-xl bg-white">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6">
            <div className="h-10 w-44 bg-white/20 rounded animate-pulse mb-3" />
            <div className="h-4 w-72 bg-white/20 rounded animate-pulse" />
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-xl overflow-hidden">
          <div className="h-14 bg-gray-100 border-b" />
          <TableSkeleton rows={8} cols={4} />
        </div>
      </div>
    </div>
  );
}
