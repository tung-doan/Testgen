"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import HistoryLoading from "./loading";
import { useOnlineExam } from "@/hooks/useOnlineExam";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Calendar,
  Clock,
  Award,
  Eye,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from "lucide-react";

export default function StudentHistory() {
  const router = useRouter();
  const { getCompletedExams } = useOnlineExam();

  const [completedExams, setCompletedExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterExams();
  }, [searchQuery, completedExams, sortOrder]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const studentData = JSON.parse(localStorage.getItem("student") || "{}");
      const studentId = studentData.id;

      if (!studentId) {
        router.push("/student/login");
        return;
      }

      const completed = await getCompletedExams(studentId);
      setCompletedExams(completed || []);
      setFilteredExams(completed || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...completedExams];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((exam) =>
        exam.exam_title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.end_time);
      const dateB = new Date(b.end_time);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    setFilteredExams(filtered);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6.5) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const calculateStats = () => {
    if (completedExams.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = completedExams.map((exam) => exam.final_score || 0);
    const total = completedExams.length;
    const avg = (scores.reduce((sum, score) => sum + score, 0) / total).toFixed(
      2,
    );
    const highest = Math.max(...scores).toFixed(2);
    const lowest = Math.min(...scores).toFixed(2);

    return {
      totalExams: total,
      averageScore: avg,
      highestScore: highest,
      lowestScore: lowest,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return <HistoryLoading />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <Card className="border-0 shadow-xl overflow-hidden !p-0">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white !p-0 !m-0">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">Exam History</CardTitle>
                    <p className="text-green-100 mt-1">
                      View your completed exams and scores
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 px-4 py-2 text-lg">
                  {completedExams.length} Exam
                  {completedExams.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Exams</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalExams}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Score</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {stats.averageScore}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Highest Score</p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.highestScore}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lowest Score</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {stats.lowestScore}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exam List */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-xl">Completed Exams</CardTitle>
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search exams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>

                  {/* Sort Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSortOrder}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortOrder === "desc" ? "Newest" : "Oldest"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {filteredExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">
                    {searchQuery ? "No exams found" : "No completed exams yet"}
                  </p>
                  <p className="text-sm">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Complete an exam to see it here"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">
                          Exam Title
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Date Taken
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Duration
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Score
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExams.map((exam) => (
                        <TableRow
                          key={exam.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-100 p-2 rounded">
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium">
                                {exam.exam_detail.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {new Date(exam.end_time).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">
                                {Math.round(
                                  (new Date(exam.end_time) -
                                    new Date(exam.start_time)) /
                                    60000,
                                )}{" "}
                                min
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`${getScoreBadgeClass(
                                exam.final_score,
                              )} font-semibold text-base px-3 py-1`}
                            >
                              {exam.final_score?.toFixed(2)} / 10
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(`/student/results/${exam.id}`)
                              }
                              className="hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
