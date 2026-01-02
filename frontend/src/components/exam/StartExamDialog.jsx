import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Award, AlertCircle } from "lucide-react";

export default function StartExamDialog({
  isOpen,
  onClose,
  exam,
  onConfirm,
  loading,
}) {
  if (!exam) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Exam</DialogTitle>
          <DialogDescription>
            Are you ready to begin <b>{exam.title}</b>?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>{exam.duration_minutes} minutes</span>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>{exam.total_questions} questions</span>
          </div>
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-yellow-600" />
            <span>{exam.total_points} points</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-blue-600 text-white"
          >
            {loading ? "Starting..." : "Start Exam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
