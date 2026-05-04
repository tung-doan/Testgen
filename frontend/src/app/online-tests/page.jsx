"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeletons";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import OnlineExamService from "@/services/onlineExam.service";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import {
  Plus,
  Users,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ManageOnlineTests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await OnlineExamService.getExams();
      setExams(data);
    } catch (err) {
      console.error("Error loading exams:", err);
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    window.dispatchEvent(new Event("navigation-start"));
    router.push("/create-test/online");
  };

  const handleViewDetails = (examId) => {
    window.dispatchEvent(new Event("navigation-start"));
    router.push(`/online-tests/${examId}`);
  };

  const handleDelete = async (examId) => {
    try {
      setLoading(true);
      await OnlineExamService.deleteExam(examId);
      // alert("Exam deleted successfully!"); // Optional, but usually not needed with good UI flow
      await loadExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
      alert("Failed to delete exam: " + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentExams = filteredExams.slice(startIndex, startIndex + rowsPerPage);

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 pt-10">
        <Card className="!p-0 w-full max-w-7xl shadow-2xl border-0 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl px-8 py-5 flex flex-row justify-between items-center">
            <div className="p-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Manage Online Tests
              </CardTitle>
              <p className="text-blue-100 text-sm mt-1">
                View, edit, and manage your online exams
              </p>
            </div>
            <Button
              onClick={handleCreateNew}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm gap-2 px-5 py-2.5 mr-2 text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Test
            </Button>
          </CardHeader>
          
          {/* Search Filter */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search exams by title..."
                className="pl-10"
              />
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-gray-400 mb-3">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No exams found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm ? "Try a different search term" : "Create your first online exam to get started"}
                </p>
              </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">Title</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">Class</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">Questions</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">Duration</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">Attempts</TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentExams.map((exam, index) => (
                        <TableRow
                          key={exam.id}
                          className={`hover:bg-blue-50/60 cursor-pointer transition-all duration-150 border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                          onClick={
                            () => {
                              window.dispatchEvent(new Event("navigation start"))
                              handleViewDetails(exam.id)
                            }
                          }
                        >
                          <TableCell className="px-6 py-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {exam.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {exam.classroom_name ? (
                              <Badge variant="outline" className="bg-blue-50">
                                <Users className="h-3 w-3 mr-1" />
                                {exam.classroom_name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No class
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-purple-100 text-purple-800">
                              {exam.total_questions || 0} questions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Clock className="h-4 w-4" />
                              {exam.duration_minutes} min
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800">
                              Max {exam.max_attempts}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAttempts(exam.id)}
                                className="hover:bg-green-50"
                                title="View Attempts"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewStatistics(exam.id)}
                                className="hover:bg-purple-50"
                                title="Statistics"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button> */}
                              {/* ✅ Removed Duplicate button */}
                              <DeleteConfirmButton
                                onConfirm={() => handleDelete(exam.id)}
                                title="Delete Online Exam"
                                description={`Are you sure you want to delete "${exam.title}"? This action cannot be undone and will remove all associated attempts and results.`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination UI */}
              {!loading && filteredExams.length > 0 && (
                <>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-4 rounded-b-lg">
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        className="gap-1 text-sm bg-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {pageNumbers.map((page) => (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            className={
                              currentPage === page
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "text-gray-600 hover:text-gray-900"
                            }
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        className="gap-1 text-sm bg-white"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="px-6 py-3 border-t border-gray-100/0 bg-transparent mt-2">
                    <p className="text-gray-500 text-xs text-center">
                      Page {currentPage} of {totalPages} · {filteredExams.length} test{filteredExams.length !== 1 ? "s" : ""} total
                    </p>
                  </div>
                </>
              )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
