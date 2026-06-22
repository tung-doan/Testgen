import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  Award,
  PlayCircle,
  BookOpen,
  RotateCcw,
} from "lucide-react";

export default function ExamCard({ exam, onStartExam, onContinueExam, loading }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasInProgress = !!exam.in_progress_attempt_id;

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col !p-0 mb-4">
      {/* Card Header */}
      <CardHeader className={`border-b ${hasInProgress ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 leading-tight">
              {exam.title}
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {hasInProgress && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  In Progress
                </Badge>
              )}
              {exam.attempts_made > 0 && (
                <Badge variant="outline" className="text-xs">
                  {exam.attempts_made}/{exam.max_attempts}
                </Badge>
              )}
            </div>
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
        <div className="space-y-3 flex-1 mb-2">
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

        {/* Action Button */}
        {hasInProgress ? (
          <Button
            onClick={() => onContinueExam ? onContinueExam(exam) : onStartExam(exam)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Continue Exam
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => onStartExam(exam)}
            disabled={exam.attempts_made >= exam.max_attempts || loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
        )}
      </CardContent>
    </Card>
  );
}