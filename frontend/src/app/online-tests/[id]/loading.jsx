import { CardSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function OnlineTestDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-xl overflow-hidden shadow-xl bg-white">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6">
            <div className="h-10 w-48 bg-white/20 rounded animate-pulse mb-3" />
            <div className="h-4 w-64 bg-white/20 rounded animate-pulse" />
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-xl overflow-hidden">
          <div className="h-14 bg-gray-100 border-b" />
          <TableSkeleton rows={8} cols={5} />
        </div>
      </div>
    </div>
  );
}
