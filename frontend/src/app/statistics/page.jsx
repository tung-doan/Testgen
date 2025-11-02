"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar as BarChart, Doughnut } from "react-chartjs-2";
import { useStatistics } from "@/hooks/useStatistics";
import {
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Star,
  ChevronRight,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Statistic() {
  const router = useRouter();
  const { getTopStudents, getTestStatistics, loading, error } = useStatistics();
  const [topStudents, setTopStudents] = useState({
    top_3_students: [],
    top_10_students: [],
  });
  const [testStats, setTestStats] = useState({ all_tests: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsData, testsData] = await Promise.all([
        getTopStudents(),
        getTestStatistics(),
      ]);
      console.log("Top Students Data:", studentsData); // Debug log
      setTopStudents(studentsData);
      setTestStats(testsData);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  };

  const handleStudentClick = (studentName, className) => {
    console.log("Navigating with:", { studentName, className }); // Debug log
    const params = new URLSearchParams();
    params.append("name", studentName);
    params.append("class", className);
    router.push(`/student?${params.toString()}`);
  };

  // Calculate statistics
  const totalTests = testStats.all_tests.length;
  const averageTestScore =
    testStats.all_tests.length > 0
      ? (
          testStats.all_tests.reduce(
            (sum, test) => sum + (test.average_score || 0),
            0
          ) / totalTests
        ).toFixed(2)
      : 0;
  const totalStudents = topStudents.top_10_students.length;
  const topScore = topStudents.top_3_students[0]?.score || 0;

  // Chart data for Top 3 Students - Bar Chart
  const top3Data = {
    labels: topStudents.top_3_students.map((s) => s.name),
    datasets: [
      {
        label: "Score",
        data: topStudents.top_3_students.map((s) => s.score),
        backgroundColor: [
          "rgba(255, 193, 7, 0.8)", // Gold
          "rgba(158, 158, 158, 0.8)", // Silver
          "rgba(205, 127, 50, 0.8)", // Bronze
        ],
        borderColor: [
          "rgba(255, 193, 7, 1)",
          "rgba(158, 158, 158, 1)",
          "rgba(205, 127, 50, 1)",
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // Chart data for Test Performance - Bar Chart
  const testData = {
    labels: testStats.all_tests.map((t) => t.title || t.test_name),
    datasets: [
      {
        label: "Average Score",
        data: testStats.all_tests.map((t) => t.average_score),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 12 },
        },
      },
    },
  };

  if (loading) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading statistics...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Error Loading Data
                </h3>
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Performance Analytics
            </h1>
            <p className="text-gray-600">
              Track student progress and test performance
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tests */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">
                      Total Tests
                    </p>
                    <p className="text-3xl font-bold">{totalTests}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <BookOpen className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Score */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">
                      Avg Score
                    </p>
                    <p className="text-3xl font-bold">{averageTestScore}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Score */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">
                      Top Score
                    </p>
                    <p className="text-3xl font-bold">{topScore}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Award className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Students */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">
                      Students
                    </p>
                    <p className="text-3xl font-bold">{totalStudents}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Users className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 3 Students */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Star className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-800">
                      Top 3 Students
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Best performing students
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {topStudents.top_3_students.length > 0 ? (
                  <div style={{ height: "300px" }}>
                    <BarChart data={top3Data} options={barOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Performance */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-800">
                      Test Performance
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Average scores across tests
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {testStats.all_tests.length > 0 ? (
                  <div style={{ height: "300px" }}>
                    <BarChart data={testData} options={barOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p>No test data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* THÊM KHOẢNG CÁCH BẰNG mt-8 hoặc mt-10 */}
          {/* Top 10 Students List */}
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 mt-10">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-800">
                    Top 10 Students Leaderboard
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Click on a student to view detailed performance
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {topStudents.top_10_students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topStudents.top_10_students.map((student, index) => (
                    <div
                      key={index}
                      onClick={() =>
                        handleStudentClick(student.name, student.class_name)
                      }
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                            index === 0
                              ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                              : index === 1
                              ? "bg-gradient-to-br from-gray-400 to-gray-500"
                              : index === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-600"
                              : "bg-gradient-to-br from-emerald-400 to-emerald-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">
                            {student.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.class_name || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-emerald-600">
                          {student.average_score || student.score}
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No student data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
