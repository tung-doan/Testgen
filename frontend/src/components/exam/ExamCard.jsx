import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  Award,
  PlayCircle,
  BookOpen,
} from "lucide-react";

export default function ExamCard({ exam, onStartExam, loading }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col !p-0 mb-4">
      {/* Card Header */}
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 leading-tight">
              {exam.title}
            </CardTitle>
            {exam.attempts_made > 0 && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {exam.attempts_made}/{exam.max_attempts}
              </Badge>
            )}
          </div>
          {exam.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {exam.description}
            </p>
          )}
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
        {/* Exam Info */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm">
              Duration: {exam.duration_minutes} minutes
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <BookOpen className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm">
              {exam.total_questions} question
              {exam.total_questions !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm">
              Total Points: {exam.total_points}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm">
              Assigned: {formatDate(exam.created_at)}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="pt-2">
          {exam.attempts_made >= exam.max_attempts ? (
            <Badge className="bg-red-100 text-red-800 border-red-200 w-full justify-center py-2 text-xs font-medium mb-2">
              Max Attempts Reached
            </Badge>
          ) : exam.show_results_immediately ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 w-full justify-center py-2 text-xs font-medium mb-2">
              Instant Results
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 w-full justify-center py-2 text-xs font-medium">
              Results Later
            </Badge>
          )}
        </div>

        {/* Start Button */}
        <Button
          onClick={() => onStartExam(exam)}
          disabled={exam.attempts_made >= exam.max_attempts || loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Starting...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Exam
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}