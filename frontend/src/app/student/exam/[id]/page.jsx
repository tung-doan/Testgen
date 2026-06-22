"use client";
import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ExamLoading from "./loading";
import { useOnlineExam } from "@/hooks/useOnlineExam";
import QuestionInput from "@/components/exam/QuestionInput";
import QuestionNavigator from "@/components/exam/QuestionNavigator";
import {
  Clock,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// CẤU HÌNH SỐ CÂU HỎI MỖI TRANG
const QUESTIONS_PER_PAGE = 40;
// Auto-save interval in milliseconds (every 30 seconds)
const AUTO_SAVE_INTERVAL = 30000;
const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL === "http://localhost:8000/api/"
    ? "/api/"
    : process.env.NEXT_PUBLIC_API_URL || "/api/";

export default function TakeExam({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { getExamAttempt, submitExam, saveAnswers, loading } = useOnlineExam();

  const [attemptData, setAttemptData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [activeNavIndex, setActiveNavIndex] = useState(-1);

  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  const [pendingScrollId, setPendingScrollId] = useState(null);

  // Track if exam was auto-expired by backend
  const [isAutoExpired, setIsAutoExpired] = useState(false);

  // Ref for auto-save to access latest answers without re-triggering effect
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Ref to track if submit is already in progress (prevent double-submit)
  const isSubmittingRef = useRef(false);

  // Ref for debounce timer
  const debounceSaveTimerRef = useRef(null);

  // Helper: save current answers to backend
  const performSave = useCallback(() => {
    const currentAnswers = answersRef.current;
    const formattedAnswers = Object.values(currentAnswers).filter(
      (answer) => answer !== null
    );
    if (formattedAnswers.length > 0) {
      saveAnswers(id, formattedAnswers).catch(() => {
        // Silent fail - already logged in hook
      });
    }
  }, [id, saveAnswers]);

  useEffect(() => {
    fetchExamAttempt();
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (!attemptData || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptData, timeRemaining]);

  // Auto-save answers periodically (every 30s)
  useEffect(() => {
    if (!attemptData || attemptData.status === "COMPLETED") return;

    const autoSaveTimer = setInterval(performSave, AUTO_SAVE_INTERVAL);

    return () => clearInterval(autoSaveTimer);
  }, [attemptData, performSave]);

  // Save answers on page refresh / tab close
  useEffect(() => {
    if (!attemptData || attemptData.status === "COMPLETED") return;

    const handleBeforeUnload = () => {
      const currentAnswers = answersRef.current;
      const formattedAnswers = Object.values(currentAnswers).filter(
        (answer) => answer !== null
      );
      if (formattedAnswers.length > 0) {
        const baseURL = getApiBaseUrl();
        const url = `${baseURL}online-exams/attempts/${id}/save-answers/`;
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url, false); // synchronous - blocks until complete
          xhr.withCredentials = true; // send cookies for auth
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({ answers: formattedAnswers }));
        } catch (err) {
          // Best effort - may fail but that's ok
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptData, id]);

  // Debounced save: save 3 seconds after the last answer change
  useEffect(() => {
    if (!attemptData || attemptData.status === "COMPLETED") return;

    // Don't save on initial load (all null answers)
    const hasAnyAnswer = Object.values(answers).some((a) => a !== null);
    if (!hasAnyAnswer) return;

    if (debounceSaveTimerRef.current) {
      clearTimeout(debounceSaveTimerRef.current);
    }

    debounceSaveTimerRef.current = setTimeout(() => {
      performSave();
    }, 3000);

    return () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
    };
  }, [answers, attemptData, performSave]);

  useEffect(() => {
    if (pendingScrollId) {
      // Tìm element trong DOM (Cần đảm bảo ID trong HTML khớp với logic này)
      const element = document.getElementById(`question-${pendingScrollId}`);

      if (element) {
        // Cuộn đến phần tử
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Reset state sau khi đã cuộn
        setPendingScrollId(null);
      }
    }
  }, [currentPage, pendingScrollId]);

  const scrollToQuestion = (index) => {
    setActiveNavIndex(index);
    if (!attemptData) return;

    const examQuestions = attemptData.exam_detail?.exam_questions || [];
    const targetQuestion = examQuestions[index];

    if (!targetQuestion) return;

    const questionId = targetQuestion.question.id;
    // Tính toán trang chứa câu hỏi (index bắt đầu từ 0)
    const targetPage = Math.floor(index / QUESTIONS_PER_PAGE) + 1;

    if (targetPage !== currentPage) {
      // TRƯỜNG HỢP 1: Khác trang -> Chuyển trang & Lưu ID cần cuộn
      setCurrentPage(targetPage);
      setPendingScrollId(questionId);
    } else {
      // TRƯỜNG HỢP 2: Cùng trang -> Tìm và cuộn ngay lập tức
      const element = document.getElementById(`question-${questionId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const fetchExamAttempt = async () => {
    try {
      const data = await getExamAttempt(id);

      // If the backend returned a COMPLETED status (auto-expired), redirect to results
      if (data.status === "COMPLETED") {
        setIsAutoExpired(true);
        setAttemptData(data);
        return;
      }

      setAttemptData(data);

      const startTime = new Date(data.start_time);
      const durationMs = data.exam_detail.duration_minutes * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationMs);
      const now = new Date();
      const remainingMs = endTime - now;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      setTimeRemaining(remainingSeconds);

      // Initialize answers - load saved answers if resuming
      const initialAnswers = {};
      const examQuestions = data.exam_detail?.exam_questions || [];
      examQuestions.forEach((eq) => {
        initialAnswers[eq.question.id] = null;
      });

      // Merge saved answers from backend (for resume)
      if (data.saved_answers) {
        Object.entries(data.saved_answers).forEach(([questionId, answerObj]) => {
          const qId = parseInt(questionId);
          if (initialAnswers.hasOwnProperty(qId)) {
            initialAnswers[qId] = answerObj;
          }
        });
      }

      setAnswers(initialAnswers);
    } catch (err) {
      console.error("Error fetching exam attempt:", err);
      setError(err.message);
    }
  };

  const handleAnswerChange = (questionId, answerData) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question: questionId,
        answer_data: answerData,
      },
    }));
  };

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const currentAnswers = answersRef.current;
      const formattedAnswers = Object.values(currentAnswers).filter(
        (answer) => answer !== null
      );

      await submitExam(id, formattedAnswers);
      router.push(`/student/results/${id}`);
    } catch (err) {
      console.error("Error auto-submitting exam:", err);
      const msg = err.response?.status === 404 ? "The exam or some questions no longer exist." : err.message;
      alert(`Failed to auto-submit exam: ${msg}`);
      isSubmittingRef.current = false;
    }
  }, [id, submitExam, router]);

  const handleSubmitExam = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      window.dispatchEvent(new Event("navigation-start"));
      const formattedAnswers = Object.values(answers).filter(
        (answer) => answer !== null,
      );

      await submitExam(id, formattedAnswers);
      router.push(`/student/results/${id}`);
    } catch (err) {
      isSubmittingRef.current = false;
      window.dispatchEvent(new Event("navigation-end"));
      console.error("Error submitting exam:", err);
      const msg = err.response?.status === 404 ? "The exam or some questions no longer exist." : err.message;
      alert(`Failed to submit exam: ${msg}`);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeRemaining < 300) return "text-red-600 bg-red-50 border-red-300";
    if (timeRemaining < 600)
      return "text-orange-600 bg-orange-50 border-orange-300";
    return "text-green-600 bg-green-50 border-green-300";
  };

  const checkIsAnswered = (answer) => {
    if (!answer || !answer.answer_data) return false;
    const data = answer.answer_data;

    // 1. Fill in the Blank (Dạng text đơn)
    if (typeof data.text === "string" && data.text.trim() !== "") {
      return true;
    }

    // 2. Fill in the Blank (Dạng nhiều ô) hoặc True/False
    if (Array.isArray(data.answers)) {
      return data.answers.some(
        (a) => a !== null && a !== "" && a !== undefined,
      );
    }

    // 3. Multiple Choice (Mảng ID)
    if (data.selected_options?.length > 0) return true;

    // 4. Ordering (Mảng ID)
    if (data.order?.length > 0) return true;

    return false;
  };

  // Cập nhật lại hàm đếm tổng số câu đã làm cho Progress Bar
  const getAnsweredCount = () => {
    return Object.values(answers).filter(checkIsAnswered).length;
  };

  // Logic chuyển trang
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Scroll lên đầu trang khi chuyển page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!attemptData) {
      window.dispatchEvent(new Event("navigation-start"));
    } else {
      window.dispatchEvent(new Event("navigation-end"));
    }
  }, [attemptData]);

  // --- LOGIC PHÂN TRANG MỚI ---
  const examQuestions = attemptData?.exam_detail?.exam_questions || [];
  const totalQuestions = examQuestions.length;
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (!attemptData) {
    return <ExamLoading />;
  }

  // Exam was auto-expired by backend - show redirect
  if (isAutoExpired) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="max-w-md shadow-xl">
            <CardContent className="pt-6 text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Time's Up!
              </h2>
              <p className="text-gray-600 mb-4">
                Your exam time has expired and was automatically submitted.
              </p>
              <Button
                onClick={() => router.push(`/student/results/${id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Time's Up View (timer reached 0 on client side)
  if (timeRemaining <= 0 && attemptData.status === "IN_PROGRESS") {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="max-w-md shadow-xl">
            <CardContent className="pt-6 text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Time's Up!
              </h2>
              <p className="text-gray-600 mb-4">
                Your exam has been automatically submitted.
              </p>
              <Button
                onClick={() => router.push(`/student/results/${id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const answeredCount = getAnsweredCount();

  // Cắt mảng câu hỏi cho trang hiện tại
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, totalQuestions);
  const currentQuestions = examQuestions.slice(startIndex, endIndex);

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* --- LEFT SIDEBAR --- */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-0 shadow-xl sticky top-4 !p-0">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white !p-0 !m-0 rounded-t-lg">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">
                        {attemptData.exam_detail.title}
                      </CardTitle>
                    </div>

                    {/* Timer */}
                    <div
                      className={`flex items-center mb-4 gap-2 px-3 py-2 rounded-lg border-2 ${getTimeColor()}`}
                    >
                      <Clock className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-xs opacity-80">Time Remaining</p>
                        <p className="text-xl font-bold">
                          {formatTime(timeRemaining)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/90">Progress</span>
                        <span className="font-semibold">
                          {answeredCount}/{totalQuestions}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-white h-full transition-all duration-300"
                          style={{
                            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5">
                  <QuestionNavigator
                    questions={examQuestions}
                    currentQuestionIndex={activeNavIndex}
                    answers={answers}
                    onQuestionClick={scrollToQuestion}
                  />
                  <Button
                    onClick={() => setIsSubmitDialogOpen(true)}
                    className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 cursor-pointer"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Exam
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* --- MAIN CONTENT (VERTICAL LIST) --- */}
            <div className="lg:col-span-3 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loop qua các câu hỏi của trang hiện tại */}
              {currentQuestions.map((q, index) => {
                const absoluteIndex = startIndex + index;
                return (
                  <Card
                    key={q.question.id}
                    id={`question-${q.question.id}`}
                    className="border-0 shadow-lg mb-8 scroll-mt-24 !p-0"
                  >
                    {/* Header câu hỏi */}
                    <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 !p-0 !m-0 rounded-t-lg">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Số thứ tự câu hỏi */}
                            <div className="flex items-center justify-center min-w-[3rem] h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex-shrink-0">
                              {absoluteIndex + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                              <CardTitle className="text-xl leading-relaxed">
                                {q.question.prompt}
                              </CardTitle>
                              {q.question.image && (
                                <div className="relative w-full max-w-2xl rounded overflow-hidden border border-gray-200 mt-4 mb-2">
                                  <img
                                    src={q.question.image}
                                    alt="Question Image"
                                    className="w-full h-auto object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap mt-2">
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  {q.question.question_type_display}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Nội dung trả lời */}
                    <CardContent className="p-6">
                      <QuestionInput
                        examQuestion={q}
                        currentAnswer={answers[q.question.id]?.answer_data}
                        onAnswerChange={handleAnswerChange}
                      />
                    </CardContent>
                  </Card>
                );
              })}

              {/* --- PAGINATION CONTROLS --- */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 pb-10">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="w-32"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Prev Page
                  </Button>

                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="w-32 bg-blue-600 hover:bg-blue-700"
                  >
                    Next Page
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Submit Exam?</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to submit your exam? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">
                Total Questions
              </span>
              <span className="font-bold text-lg">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">
                Answered
              </span>
              <span className="font-bold text-lg text-green-700">
                {answeredCount}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">
                Unanswered
              </span>
              <span className="font-bold text-lg text-red-700">
                {totalQuestions - answeredCount}
              </span>
            </div>
          </div>

          {totalQuestions - answeredCount > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                You have {totalQuestions - answeredCount} unanswered question
                {totalQuestions - answeredCount !== 1 ? "s" : ""}. Are you sure
                you want to submit?
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsSubmitDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitExam}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 cursor-pointer"
            >
              {loading ? (
                <>
                  {" "}
                  <span className="animate-spin mr-2">⏳</span>{" "}
                  Submitting...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Send className="h-4 w-4 mr-2" /> Confirm Submit{" "}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
