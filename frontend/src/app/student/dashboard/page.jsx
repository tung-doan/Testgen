"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from "@/app/loading";
import { useOnlineExam } from "@/hooks/useOnlineExam";
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
} from "lucide-react";
// ✅ Import Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// ✅ Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StudentDashboard() {
  const router = useRouter();
  const { getPendingExams, getCompletedExams } = useOnlineExam();

  const [studentInfo, setStudentInfo] = useState(null);
  const [pendingExams, setPendingExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    completed: 0,
    pending: 0,
    averageScore: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const studentData = JSON.parse(localStorage.getItem("student") || "{}");
      setStudentInfo(studentData);

      const studentId = studentData.id;

      if (!studentId) {
        router.push("/student/login");
        return;
      }

      const [pending, completed] = await Promise.all([
        getPendingExams(studentId),
        getCompletedExams(studentId),
      ]);

      setPendingExams(pending || []);
      setCompletedExams(completed || []);

      const totalExams = (pending?.length || 0) + (completed?.length || 0);
      const avgScore =
        completed.length > 0
          ? (
              completed.reduce(
                (sum, exam) => sum + (exam.final_score || 0),
                0
              ) / completed.length
            ).toFixed(2)
          : 0;

      setStats({
        totalExams,
        completed: completed?.length || 0,
        pending: pending?.length || 0,
        averageScore: avgScore,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6.5) return "text-blue-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6.5) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // ✅ Prepare data for Line Chart
  const getChartData = () => {
    if (completedExams.length === 0) return null;

    // Sort by end_time
    const sortedExams = [...completedExams].sort(
      (a, b) => new Date(a.end_time) - new Date(b.end_time)
    );

    const labels = sortedExams.map((exam) =>
      new Date(exam.end_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );

    const scores = sortedExams.map((exam) => exam.final_score || 0);

    return {
      labels,
      datasets: [
        {
          label: "Exam Scores",
          data: scores,
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "rgb(34, 197, 94)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Score: ${context.parsed.y.toFixed(2)} / 10`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Header */}
          <Card className="border-0 shadow-xl overflow-hidden !p-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white !p-0 !m-0">
              <div className="flex items-center justify-between px-6 py-6">
                <div>
                  <CardTitle className="text-3xl mb-2">
                    Welcome back, {studentInfo?.name || "Student"}! 👋
                  </CardTitle>
                  <p className="text-blue-100">
                    {studentInfo?.classroom_name
                      ? `Class: ${studentInfo.classroom_name}`
                      : "No class assigned"}
                  </p>
                  <p className="text-blue-200 text-sm">
                    Student ID: {studentInfo?.student_id || "N/A"}
                  </p>
                </div>
                <div className="bg-white/20 p-4 rounded-full hidden md:block">
                  <BookOpen className="h-12 w-12" />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Exams */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">
                      Total Exams
                    </p>
                    <p className="text-4xl font-bold">{stats.totalExams}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <FileText className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Exams */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium mb-1">
                      Pending
                    </p>
                    <p className="text-4xl font-bold">{stats.pending}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Clock className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed Exams */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">
                      Completed
                    </p>
                    <p className="text-4xl font-bold">{stats.completed}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Score */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">
                      Avg Score
                    </p>
                    <p className="text-4xl font-bold">{stats.averageScore}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Award className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Exams List */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-800">
                        Pending Exams
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Exams waiting to be taken
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    {stats.pending}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {pendingExams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No pending exams</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingExams.slice(0, 5).map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 line-clamp-1">
                            {exam.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exam.duration_minutes}min
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {exam.total_questions} questions
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push("/student/pending")}
                          className="ml-2 bg-orange-600 hover:bg-orange-700"
                        >
                          View
                        </Button>
                      </div>
                    ))}
                    {pendingExams.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push("/student/pending")}
                      >
                        View All ({pendingExams.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✅ Score Trend Chart */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-800">
                        Score Trend
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Your performance over time
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {completedExams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No completed exams yet</p>
                    <p className="text-xs mt-2">
                      Complete exams to see your progress
                    </p>
                  </div>
                ) : (
                  <div className="h-64">
                    <Line data={getChartData()} options={chartOptions} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push("/student/pending")}
                  className="h-24 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex flex-col items-center justify-center gap-2"
                >
                  <FileText className="h-6 w-6" />
                  <span className="font-semibold">View Pending Tests</span>
                </Button>

                <Button
                  onClick={() => router.push("/student/history")}
                  className="h-24 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex flex-col items-center justify-center gap-2"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="font-semibold">View History</span>
                </Button>

                <Button
                  onClick={() => router.push("/student/classes")}
                  className="h-24 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white flex flex-col items-center justify-center gap-2"
                >
                  <BookOpen className="h-6 w-6" />
                  <span className="font-semibold">My Classes</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
