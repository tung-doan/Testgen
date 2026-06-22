"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useTest } from "@/hooks/useTest";
import TestService from "@/services/test.service";
import { usePrefetch } from "@/hooks/usePrefetch";
import { Download, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import Notification from "@/components/common/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TestSummary() {
  const router = useRouter();
  const { getTestSummary, downloadAllVariants, deleteTest, loading, error } = useTest();
  const { prefetch } = usePrefetch();
  const [tests, setTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const rowsPerPage = 20;

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (localStorage.getItem("newTestCreated") === "true") {
      fetchTests();
      localStorage.removeItem("newTestCreated");
    }
  }, []);

  const fetchTests = async () => {
    try {
      const data = await getTestSummary();
      setTests(data);
    } catch (err) {
      console.error("Error fetching tests:", err);
      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    }
  };

  const handleCreateTest = () => {
    window.dispatchEvent(new Event("navigation-start"));
    router.push("/create-test/paper/");
  };

  // Prefetch route tạo đề thi (user thường click vào đây)
  useEffect(() => {
    router.prefetch('/create-test/paper');
  }, [router]);

  const handleTestClick = (testId) => {
    window.dispatchEvent(new Event("navigation-start"));
    router.push(`/quiz/${testId}`);
  };

  const handleDownloadAll = async (e, testId, testTitle) => {
    e.stopPropagation();
    try {
      setDownloadingId(testId);
      const blob = await downloadAllVariants(testId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${testTitle}_All_Variants.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotification("Variants downloaded successfully!");
    } catch (err) {
      console.error("Error downloading variants:", err);
      showNotification(err.message || "Failed to download variants", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await deleteTest(testId);
      setTests((prev) => prev.filter((t) => t.id !== testId));
      showNotification("Test deleted successfully!");
    } catch (err) {
      console.error("Error deleting test:", err);
      showNotification(err.message || "Failed to delete test", "error");
      throw err;
    }
  };

  // Filter and Pagination
  const filteredTests = tests
    .filter((test) =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  
  const totalPages = Math.ceil(filteredTests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentTests = filteredTests.slice(startIndex, startIndex + rowsPerPage);

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-green-100 to-green-200 p-6 pt-10">
        <Card className="!p-0 w-full max-w-7xl shadow-2xl border-0 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-t-xl px-8 py-5 flex flex-row justify-between items-center">
            <div className="p-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Test Summary
              </CardTitle>
              <p className="text-green-100 text-sm mt-1">
                Manage and monitor all your tests
              </p>
            </div>
            <Button
              onClick={handleCreateTest}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm gap-2 px-5 mr-2 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Test
            </Button>
          </CardHeader>
          
          {/* Search Filter */}
          <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tests by name..."
                className="pl-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto bg-white border-gray-200 text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-green-500/20">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-100 shadow-lg rounded-md">
                  <SelectItem value="newest" className="cursor-pointer">Newest</SelectItem>
                  <SelectItem value="oldest" className="cursor-pointer">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="p-0">
            {loading && !downloadingId ? (
              <TableSkeleton rows={8} cols={6} />
            ) : error && !downloadingId ? (
              <p className="text-center text-red-600 p-12">{error}</p>
            ) : tests.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-gray-400 mb-3">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No tests found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm ? "Try a different search term" : "Create your first test to get started"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Test Name
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Participants
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Variants
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Date Created
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Average Score
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTests.map((test, index) => (
                        <TableRow
                          key={test.id}
                          className={`hover:bg-green-50/60 transition-all duration-150 cursor-pointer border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                          onClick={() => handleTestClick(test.id)}
                          onMouseEnter={() => prefetch(`quiz-${test.id}`, () => TestService.getTestById(test.id, { silent: true }))}
                        >
                          <TableCell className="px-6 py-4 font-medium text-gray-900">
                            {test.title}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-gray-700">
                              <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                              {test.submission_count}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              test.variant_count > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {test.variant_count} variant{test.variant_count !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-600">
                            {test.created_at
                              ? new Date(test.created_at).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={`font-semibold ${
                              test.avg_score >= 7 ? "text-green-600" :
                              test.avg_score >= 5 ? "text-yellow-600" :
                              test.avg_score > 0 ? "text-red-500" :
                              "text-gray-400"
                            }`}>
                              {test.avg_score > 0 ? test.avg_score : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {test.variant_count > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800 text-xs px-3 py-1.5 h-8 transition-all duration-150 cursor-pointer"
                                  disabled={downloadingId === test.id}
                                  onClick={(e) =>
                                    handleDownloadAll(e, test.id, test.title)
                                  }
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {downloadingId === test.id
                                    ? "Downloading..."
                                    : `Download (${test.variant_count})`}
                                </Button>
                              )}
                              <DeleteConfirmButton
                                onConfirm={() => handleDeleteTest(test.id)}
                                title="Delete Test"
                                description={`Are you sure you want to delete "${test.title}"? This action cannot be undone.`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      className="gap-1 text-sm"
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
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "text-gray-600 hover:text-gray-900"
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      className="gap-1 text-sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="px-6 py-3 border-t border-gray-100 bg-white">
                  <p className="text-gray-400 text-xs text-center">
                    Page {currentPage} of {totalPages} · {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""} total
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