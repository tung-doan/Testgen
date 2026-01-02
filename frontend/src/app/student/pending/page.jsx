"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from "@/app/loading";
import { useOnlineExam } from "@/hooks/useOnlineExam";
import ExamCard from "@/components/exam/ExamCard";
import StartExamDialog from "@/components/exam/StartExamDialog";
import EmptyState from "@/components/exam/EmptyState";
import { FileText, AlertCircle } from "lucide-react";

export default function PendingTests() {
  const router = useRouter();
  const { getPendingExams, startExam, loading } = useOnlineExam();
  const [pendingExams, setPendingExams] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [error, setError] = useState(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const studentData = JSON.parse(localStorage.getItem("student") || "{}");

    console.log("📌 Student data from localStorage:", studentData);

    const actualStudentId = studentData.id;

    console.log("📌 Using student ID:", actualStudentId);

    if (actualStudentId) {
      setStudentId(actualStudentId);
      fetchPendingExams(actualStudentId);
    } else {
      setError("Student information not found. Please login again.");
      setTimeout(() => {
        router.push("/student/login");
      }, 2000);
    }
  }, []);

  const fetchPendingExams = async (id) => {
    try {
      console.log("🔍 Fetching pending exams for student ID:", id);
      const data = await getPendingExams(id);
      console.log("✅ Received pending exams:", data);
      setPendingExams(data || []);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching pending exams:", err);
      setError(err.message || "Failed to load pending exams");
    }
  };

  const handleOpenDialog = (exam) => {
    setSelectedExam(exam);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isStarting) {
      setIsDialogOpen(false);
      setSelectedExam(null);
    }
  };

  const handleConfirmStart = async () => {
    if (!studentId || !selectedExam) {
      alert("Student ID or exam not found. Please try again.");
      return;
    }

    try {
      setIsStarting(true);
      console.log(
        "🚀 Starting exam:",
        selectedExam.id,
        "for student:",
        studentId
      );

      const attempt = await startExam(selectedExam.id, studentId);
      console.log("✅ Attempt created:", attempt);

      const attemptId = attempt.attempt_id || attempt.id;

      // Redirect to exam page
      router.push(`/student/exam/${attemptId}`);
    } catch (err) {
      console.error("❌ Error starting exam:", err);
      setIsStarting(false);
      setIsDialogOpen(false);
      alert(`Failed to start exam: ${err.message}`);
    }
  };

  if (loading && pendingExams.length === 0) {
    return <LoadingScreen message="Loading pending tests..." />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <Card className="border-0 shadow-xl overflow-hidden !p-0 mb-4">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white !p-0 !m-0">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">Pending Tests</CardTitle>
                    <p className="text-blue-100 mt-1">
                      Complete your assigned online exams
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 px-4 py-2 text-lg">
                  {pendingExams.length} Test
                  {pendingExams.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4 px-6">
                <div className="flex items-center gap-3 text-red-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Exams List */}
          {pendingExams.length === 0 && !error && !loading ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onStartExam={handleOpenDialog}
                  loading={loading}
                />
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-5 px-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-semibold">Important Notes:</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      You must complete the exam within the given time limit
                    </li>
                    <li>Once started, the timer cannot be paused</li>
                    <li>Make sure you have a stable internet connection</li>
                    <li>Some exams have limited attempts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Start Exam Confirmation Dialog */}
      <StartExamDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        exam={selectedExam}
        onConfirm={handleConfirmStart}
        loading={isStarting}
      />
    </>
  );
}
