import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function EmptyState() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="py-16 px-6">
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            You have no pending tests at the moment. Check back later for new
            assignments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
