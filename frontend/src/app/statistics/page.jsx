"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import axios from "axios";
import {
  Bar,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar as BarChart } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Statistic() {
  const router = useRouter();
  const [topStudents, setTopStudents] = useState({ top_3_students: [], top_10_students: [] });
  const [testStats, setTestStats] = useState({ all_tests: [] }); // Cập nhật để nhận all_tests
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsResponse, testsResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}api/statistics/top-students/`, { withCredentials: true }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}api/statistics/test-statistics/`, { withCredentials: true }),
        ]);
        console.log("Top Students Response:", studentsResponse.data);
        console.log("Test Statistics Response:", testsResponse.data);
        setTopStudents(studentsResponse.data);
        setTestStats(testsResponse.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Failed to load statistics. Please try again.");
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Dữ liệu cho biểu đồ top 3 học sinh
  const top3Data = {
    labels: (topStudents.top_3_students || []).map(student => `${student.name} (${student.student_id})`),
    datasets: [
      {
        label: "Average Score",
        data: (topStudents.top_3_students || []).map(student => student.average_score || 0),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Dữ liệu cho danh sách top 10 học sinh
  const top10Data = (topStudents.top_10_students || []).map(student => ({
    name: `${student.name} (${student.student_id})`,
    score: student.average_score || 0,
    raw_name: student.name, // Lưu tên gốc để gửi query
    class_name: student.class_name || "N/A", // Lấy tên lớp từ API
  }));

  // Dữ liệu cho biểu đồ phân bố điểm của tất cả bài kiểm tra
  const testData = {
    labels: (testStats.all_tests || []).map(test => test.title),
    datasets: [
      {
        label: "Average Score",
        data: (testStats.all_tests || []).map(test => test.average_score || 0),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Statistics" },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Score" },
      },
    },
  };

  // Hàm xử lý nhấp vào học sinh
  const handleStudentClick = (studentName, className) => {
    const params = new URLSearchParams();
    params.append("name", studentName);
    params.append("class", className);
    router.push(`/student?${params.toString()}`);
  };

  if (loading) return <p className="text-center text-gray-600">Loading...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <div className="w-full max-w-6xl space-y-8">
          <Card className="shadow-xl border-0 transition-transform hover:scale-[1.02] mb-4">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center text-green-800">
                Student Performance Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Top 3 Students</h3>
              {topStudents.top_3_students.length > 0 ? (
                <BarChart data={top3Data} options={options} />
              ) : (
                <p className="text-center text-gray-600">No data available for Top 3 Students.</p>
              )}
              <h3 className="text-lg font-medium text-gray-700 mt-6 mb-2">Top 10 Students</h3>
              {top10Data.length > 0 ? (
                <ul className="list-disc pl-5">
                  {top10Data.map((student, index) => (
                    <li
                      key={index}
                      className="text-gray-600 hover:text-blue-600 cursor-pointer"
                      onClick={() => handleStudentClick(student.raw_name, student.class_name)}
                    >
                      {student.name}: {student.score}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-600">No data available for Top 10 Students.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 transition-transform hover:scale-[1.02]">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center text-green-800">
                Test Performance Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Average Score Distribution Across Tests</h3>
              {testStats.all_tests.length > 0 ? (
                <BarChart data={testData} options={options} />
              ) : (
                <p className="text-center text-gray-600">No test data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}