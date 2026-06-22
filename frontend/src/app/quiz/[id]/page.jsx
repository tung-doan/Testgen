"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import imageCompression from "browser-image-compression";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { TableSkeleton, CardSkeleton } from "@/components/ui/skeletons";
import { useTest } from "@/hooks/useTest";
import { useSubmission } from "@/hooks/useSubmission";
import { useStatistics } from "@/hooks/useStatistics";
import {
  Trash2,
  Upload,
  BarChart3,
  Loader2,
  AlertCircle,
  Search,
  FileText,
  Hash,
  Camera,
  Menu,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import CameraScanner from "@/components/CameraScanner";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";

export default function SubmissionSummary() {
  const { id: test_id } = useParams();
  const router = useRouter();

 // Hooks
  const { getTestById } = useTest();
  const {
    getSubmissionSummary,
    deleteSubmission,
    uploadSubmission,
    uploadBatchSubmission,
  } = useSubmission();
  const { getTestQuestionStats } = useStatistics();

 // UI State
  const [openingTestDetail, setOpeningTestDetail] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

 // State
  const [testName, setTestName] = useState("");
  const [testData, setTestData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

 // Search state
  const [searchQuery, setSearchQuery] = useState("");

 // Submission Dialog
  const [isAddSubmissionDialogOpen, setIsAddSubmissionDialogOpen] =
    useState(false);
  const [submissionImages, setSubmissionImages] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchProgress, setBatchProgress] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [pollCount, setPollCount] = useState(0);

 // Statistics modal
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState(null);

 // Camera scanner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraUploading, setCameraUploading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [test_id]);

  useEffect(() => {
    if (localStorage.getItem("newSubmissionAdded") === "true") {
      refreshSubmissions();
      localStorage.removeItem("newSubmissionAdded");
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSubmissions(submissions);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = submissions.filter(
        (sub) =>
          sub.detected_mssv?.toLowerCase().includes(q) ||
          sub.student_name?.toLowerCase().includes(q) ||
          sub.variant_code?.toLowerCase().includes(q),
      );
      setFilteredSubmissions(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, submissions]);

  // Auto-refresh logic for missing images (Background Cloudinary upload)
  useEffect(() => {
    // Only auto-refresh if there is at least one submission missing an image
    // and it's not currently refreshing to avoid infinite loops
    if (submissions.length > 0 && !isRefreshing) {
      const hasMissingImages = submissions.some((sub) => !sub.submission_image);
      if (hasMissingImages && pollCount < 5) {
        const timer = setTimeout(() => {
          refreshSubmissions();
          setPollCount(prev => prev + 1);
        }, 3000); // Check every 3 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [submissions, isRefreshing, pollCount]);

 // Initial load: fetch test + submissions in one go (single skeleton)
  const loadAll = async () => {
    try {
      if (!test_id) return;
      setLoading(true);
      const data = await getTestById(test_id);
      setTestData(data);
      setTestName(data.title);

      const subs = await getSubmissionSummary(test_id);
      setSubmissions(subs);
      setFilteredSubmissions(subs);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshSubmissions = async (resetPoll = false) => {
    if (resetPoll === true) setPollCount(0);
    try {
      setIsRefreshing(true);
      const data = await getSubmissionSummary(test_id);
      setSubmissions(data);
      setFilteredSubmissions(data);
      setError(null);
    } catch (err) {
      console.error("Error refreshing submissions:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchQuestionStats = async () => {
    try {
      setLoadingStats(true);
      const data = await getTestQuestionStats(test_id);
      setStatsData(data);
      setIsStatsModalOpen(true);
    } catch (err) {
      console.error("Error fetching question statistics:", err);
      alert("Failed to load statistics. Please try again.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddSubmission = () => {
    setTimeout(() => {
      setIsAddSubmissionDialogOpen(true);
      setSubmissionImages([]);
      setUploadError(null);
      setBatchResults(null);
      setBatchProgress("");
      setIsCompressing(false);
    }, 10);
  };

  const handleOpenCamera = () => {
    setTimeout(() => {
      setIsCameraOpen(true);
    }, 10);
  };

  const handleImagesChange = async (e) => {
    if (e.target.files.length > 0) {
      if (e.target.files.length > 20) {
        setUploadError("To prevent system overload, you can only upload a maximum of 20 images at a time.");
        return;
      }
      
      const files = Array.from(e.target.files);
      setIsCompressing(true);
      setUploadError(null);
      
      const options = {
        maxSizeMB: 0.8, // Allow up to 800KB to ensure quality for OMR
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        const compressedFiles = await Promise.all(
          files.map(async (file) => {
            try {
              const compressedBlob = await imageCompression(file, options);
              // Explicitly create a new File to preserve the original filename and type
              return new File([compressedBlob], file.name, {
                type: file.type || "image/jpeg",
                lastModified: Date.now(),
              });
            } catch (error) {
              console.error("Compression error:", error);
              return file; // fallback to original if compression fails
            }
          })
        );
        setSubmissionImages(compressedFiles);
      } catch (error) {
        setUploadError("Failed to compress images. Please try again.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmitSubmission = async () => {
    try {
      setUploadLoading(true);
      setUploadError(null);
      setBatchResults(null);

      if (submissionImages.length === 0) {
        setUploadError("Please select at least one image");
        return;
      }

      if (submissionImages.length === 1) {
        const formData = new FormData();
        formData.append("test_id", test_id);
        formData.append("submission_image", submissionImages[0]);

        const result = await uploadSubmission(formData);
        
 // Convert single result to batch format for UI
        setBatchResults({
          summary: { total: 1, success: 1, failed: 0 },
          results: [{
            index: 0,
            filename: submissionImages[0].name,
            status: "success",
            detected_mssv: result.detected_mssv,
            variant_code: result.variant_code,
            total_score: result.total_score,
            submission_image: result.submission_image
          }]
        });
        setCurrentImageIndex(0);
      } else {
        const formData = new FormData();
        formData.append("test_id", test_id);
        submissionImages.forEach((img) => {
          formData.append("submission_images", img);
        });
        const result = await uploadBatchSubmission(formData);
        setBatchResults(result);
        setCurrentImageIndex(0);
      }

      setSubmissionImages([]);
      refreshSubmissions(true);
    } catch (err) {
      setUploadError(
        err.message || "Failed to process submission. Please try again.",
      );
    } finally {
      setUploadLoading(false);
      setBatchProgress("");
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await deleteSubmission(submissionId);
 // alert("Submission deleted successfully!");
      refreshSubmissions(true);
    } catch (err) {
      console.error("Error deleting submission:", err);
      alert("Failed to delete submission. Please try again.");
      throw err;
    }
  };

  const handleSubmissionClick = (submission) => {
    window.open(submission.submission_image, "_blank");
  };

  const handleViewTestDetail = () => {
    setOpeningTestDetail(true);
    router.push(`/quiz/${test_id}/test-detail`);
  };

  const handleExportExcel = () => {
    try {
      if (filteredSubmissions.length === 0) {
        alert("No data to export");
        return;
      }

      const dataToExport = filteredSubmissions.map((sub) => ({
        MSSV: sub.detected_mssv || "-",
        Point: sub.total_score,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

 // Set column widths
      worksheet["!cols"] = [{ wch: 20 }, { wch: 15 }];

      XLSX.writeFile(workbook, `${testName}_Submissions.xlsx`);
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert(
        "Failed to export Excel. Please make sure the 'xlsx' library is installed.",
      );
    }
  };

 // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentSubmissions = filteredSubmissions.slice(
    indexOfFirstRow,
    indexOfLastRow,
  );
  const totalPages = Math.ceil(filteredSubmissions.length / rowsPerPage);

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading && submissions.length === 0) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pt-16 pb-12 px-4">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Header Card Skeleton */}
            <div className="rounded-xl overflow-hidden shadow-xl bg-white mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-8 w-64 bg-white/20 rounded animate-pulse mb-3" />
                    <div className="h-4 w-40 bg-white/20 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-36 bg-white/20 rounded-lg animate-pulse" />
                    <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                    <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            {/* Table Skeleton */}
            <div className="rounded-xl bg-white shadow-xl overflow-hidden">
              <div className="p-6 pb-0">
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-6" />
              </div>
              <TableSkeleton rows={10} cols={6} />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Card */}
          <Card className="w-full shadow-xl border-0 transition-transform hover:scale-[1.02] mb-6 !p-0">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-semibold">
                    {testName} - Submissions
                  </CardTitle>
                  <p className="text-green-100 mt-1 text-sm md:text-base">
                    Total: {filteredSubmissions.length} submission
                    {filteredSubmissions.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Desktop buttons */}
                <div className="hidden md:flex gap-2">
                  <Button
                    onClick={handleViewTestDetail}
                    className="bg-white text-green-700 hover:bg-green-50 cursor-pointer"
                    disabled={openingTestDetail}
                  >
                    {openingTestDetail ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5 mr-2" />
                    )}
                    {openingTestDetail ? "Opening..." : "View Test Details"}
                  </Button>
                  <Button
                    onClick={fetchQuestionStats}
                    className="bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
                    disabled={loadingStats}
                  >
                    {loadingStats ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <BarChart3 className="h-4 w-4 mr-2" />
                    )}
                    Question Stats
                  </Button>

                  <Button
                    onClick={handleOpenCamera}
                    className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Camera
                  </Button>
                  <Button
                    onClick={handleAddSubmission}
                    className="bg-green-600 hover:bg-green-700 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <Button
                    onClick={handleExportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
                    disabled={filteredSubmissions.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>

                {/* Mobile dropdown */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2">
                        <Menu className="h-4 w-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={handleViewTestDetail}
                        disabled={openingTestDetail}
                        className="cursor-pointer gap-2 py-3"
                      >
                        <FileText className="h-4 w-4 text-green-600" />
                        {openingTestDetail ? "Opening..." : "View Test Details"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={fetchQuestionStats}
                        disabled={loadingStats}
                        className="cursor-pointer gap-2 py-3"
                      >
                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                        Question Stats
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleOpenCamera}
                        className="cursor-pointer gap-2 py-3"
                      >
                        <Camera className="h-4 w-4 text-blue-600" />
                        Scan Camera
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleAddSubmission}
                        className="cursor-pointer gap-2 py-3"
                      >
                        <Upload className="h-4 w-4 text-green-600" />
                        Upload Image
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportExcel}
                        disabled={filteredSubmissions.length === 0}
                        className="cursor-pointer gap-2 py-3"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                        Export Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
          </Card>

          {openingTestDetail && (
            <div className="mb-6">
              <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                  style={{
                    animation: "progressSlide 1.5s ease-in-out infinite",
                    width: "40%",
                  }}
                />
              </div>
              <p className="text-xs text-emerald-700 mt-2 animate-pulse">
                Preparing test details...
              </p>
              <style jsx>{`
                @keyframes progressSlide {
                  0% {
                    transform: translateX(-100%);
                  }
                  50% {
                    transform: translateX(150%);
                  }
                  100% {
                    transform: translateX(250%);
                  }
                }
              `}</style>
            </div>
          )}

          {/* Submissions Table */}
          <Card className="w-full shadow-xl border-0">
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="mb-6 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by MSSV, or variant code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={refreshSubmissions}
                  variant="outline"
                  className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              {loading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    {searchQuery
                      ? "No matching submissions found"
                      : "No submissions found"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={handleAddSubmission}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Upload your first submission
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">
                          MSSV
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          Variant
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          Score
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          Submission
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-mono font-medium text-blue-700">
                            {submission.detected_mssv || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                              {submission.variant_code || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600 text-lg">
                              {submission.total_score}
                            </span>
                          </TableCell>
                          <TableCell>
                            {submission.submission_image ? (
                              <div
                                className="relative w-12 h-12 md:w-16 md:h-16 cursor-pointer group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm"
                                onClick={() =>
                                  handleSubmissionClick(submission)
                                }
                                title="Click to view full image"
                              >
                                <img
                                  src={submission.submission_image}
                                  alt="Submission"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Search className="text-white h-4 w-4" />
                                </div>
                              </div>
                            ) : pollCount >= 5 ? (
                              <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border border-red-200 bg-red-50 flex flex-col items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-red-400 mb-1" />
                                <span className="text-[10px] text-red-500 text-center leading-tight px-1">
                                  Image Error
                                </span>
                              </div>
                            ) : (
                              <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex flex-col items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400 mb-1" />
                                <span className="text-[10px] text-gray-500 text-center leading-tight px-1">
                                  Processing
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <DeleteConfirmButton
                              onConfirm={() =>
                                handleDeleteSubmission(submission.id)
                              }
                              buttonText=""
                              title="Delete Submission"
                              description="Are you sure you want to delete this submission?"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <p className="text-gray-500 text-sm">
                        Page {currentPage} of {totalPages} · {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* UPLOAD SUBMISSION DIALOG — supports multiple files */}
          <Dialog
            open={isAddSubmissionDialogOpen}
            onOpenChange={(open) => {
              if (!open && !uploadLoading) {
                setIsAddSubmissionDialogOpen(false);
                setSubmissionImages([]);
                setUploadError(null);
                setIsCompressing(false);
                setBatchResults(null);
                setCurrentImageIndex(0);
              }
            }}
          >
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Upload className="h-6 w-6 text-green-600" />
                  Upload Answer Sheets
                </DialogTitle>
                <DialogDescription>
                  Select one or multiple scanned OMR answer sheets. The system
                  will automatically detect MSSV, variant code, and grade the
                  answers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {uploadError && (
                  <Alert variant="destructive" className = "mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {/* Batch Results — shown after processing */}
                {batchResults && (
                  <div className="space-y-4">
                    <div
                      className={`p-3 rounded-lg border mb-2 ${
                        batchResults.summary.failed === 0
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <p className="font-semibold text-sm mb-2">
                        {batchResults.summary.success}/
                        {batchResults.summary.total} graded successfully
                        {batchResults.summary.failed > 0 && (
                          <span className="text-red-600 ml-1">
                            ({batchResults.summary.failed} failed)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Image Carousel for successful results */}
                    {batchResults.results.filter(r => r.status === "success" && r.submission_image).length > 0 && (
                      <div className="relative rounded-lg border bg-gray-50 p-2 mb-2">
                        {(() => {
                          const successResults = batchResults.results.filter(r => r.status === "success" && r.submission_image);
                          const currentResult = successResults[currentImageIndex];
                          
                          if (!currentResult) return null;
                          
                          return (
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-xs font-medium text-gray-500">
                                  {currentImageIndex + 1} of {successResults.length}
                                </span>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 w-7 p-0" 
                                    disabled={currentImageIndex === 0}
                                    onClick={() => setCurrentImageIndex(prev => prev - 1)}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 w-7 p-0" 
                                    disabled={currentImageIndex === successResults.length - 1}
                                    onClick={() => setCurrentImageIndex(prev => prev + 1)}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="relative w-full h-[400px] flex items-center justify-center bg-white rounded border">
                                <img 
                                  src={currentResult.submission_image} 
                                  alt={`Graded ${currentResult.filename}`}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <div className="mt-3 p-3 bg-white rounded border border-green-100 text-sm">
                                <p className="font-medium truncate mb-1">{currentResult.filename}</p>
                                <p className="text-green-700 font-medium">
                                  MSSV: {currentResult.detected_mssv || "—"} · Variant:{" "}
                                  {currentResult.variant_code || "—"} · Score: {currentResult.total_score}/10
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Failed Results List */}
                    {batchResults.results.filter(r => r.status === "failed").length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        <p className="text-sm font-semibold text-red-700 px-1">Failed to Grade:</p>
                        {batchResults.results.filter(r => r.status === "failed").map((r, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border text-sm flex items-start gap-2 bg-red-50 border-red-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{r.filename}</p>
                              <p className="text-red-700">{r.error}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* File picker — hidden after results are shown */}
                {!batchResults && (
                  <>
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Photo Capture Advice</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        For best grading results, ensure good lighting, keep the paper flat without folds, and make sure all 4 black corner markers are clearly visible in the photo.
                      </AlertDescription>
                    </Alert>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">Auto-detection enabled</p>
                          <p className="text-blue-600 mt-1">
                            MSSV (8 digits), Test ID (3 digits), and answers
                            will be automatically detected from the filled
                            bubbles.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="submissionImages"
                        className="text-base font-semibold flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Answer Sheet Images *
                      </Label>
                      <Input
                        id="submissionImages"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagesChange}
                        disabled={isCompressing || uploadLoading}
                        className="cursor-pointer h-12"
                      />
                      {isCompressing && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Compressing images before upload...</span>
                        </div>
                      )}
                      {submissionImages.length > 0 && !isCompressing && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">
                              {submissionImages.length} file
                              {submissionImages.length > 1 ? "s" : ""} selected
                            </span>
                          </div>
                          <div className="text-xs text-green-600 max-h-20 overflow-y-auto">
                            {submissionImages.map((f, i) => (
                              <div key={i} className="truncate">
                                {f.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {uploadLoading && (
                      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg mt-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          {batchProgress || "Uploading and processing OMR..."}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                {batchResults ? (
                  <Button
                    onClick={() => {
                      setIsAddSubmissionDialogOpen(false);
                      setBatchResults(null);
                      setSubmissionImages([]);
                    }}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    Done
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddSubmissionDialogOpen(false);
                        setSubmissionImages([]);
                        setUploadError(null);
                      }}
                      disabled={uploadLoading}
                      className="px-6 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitSubmission}
                      disabled={uploadLoading || isCompressing || submissionImages.length === 0}
                      className="bg-green-600 hover:bg-green-700 px-6 cursor-pointer"
                    >
                      {uploadLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCompressing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Compressing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload & Scan
                          {submissionImages.length > 1
                            ? ` (${submissionImages.length} files)`
                            : ""}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Question Statistics Modal */}
          <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 rounded-t-lg">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    Question Statistics
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100">
                    Detailed analysis of student performance per question
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6">
                {statsData ? (
                  statsData.total_submissions === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        No Submissions Yet
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        {statsData.message ||
                          "There are no submissions for this test yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                          <p className="text-sm font-medium text-blue-600 mb-1">
                            Total Submissions
                          </p>
                          <p className="text-3xl font-bold text-blue-800">
                            {statsData.total_submissions}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                          <p className="text-sm font-medium text-green-600 mb-1">
                            Average Score
                          </p>
                          <p className="text-3xl font-bold text-green-800">
                            {statsData.average_score?.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                          <p className="text-sm font-medium text-purple-600 mb-1">
                            Avg Correct Rate
                          </p>
                          <p className="text-3xl font-bold text-purple-800">
                            {statsData.average_correct_rate?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Per-Question Stats */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Per-Question Breakdown
                        </h3>
                        {statsData.question_stats?.map((stat) => {
                          const correctRate = stat.correct_rate ?? 0; // 0-100 scale from backend
                          const correctPct = correctRate / 100; // 0-1 for color thresholds
                          const wrongAnswers =
                            (stat.total_answers || 0) -
                            (stat.correct_answers || 0);

                          return (
                            <div
                              key={stat.question_order}
                              className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                                correctPct >= 0.7
                                  ? "border-green-200 bg-green-50/50"
                                  : correctPct >= 0.4
                                    ? "border-yellow-200 bg-yellow-50/50"
                                    : "border-red-200 bg-red-50/50"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm text-sm font-bold text-gray-700 border">
                                    {stat.question_order}
                                  </span>
                                  <span
                                    className="text-sm text-gray-600 max-w-md truncate"
                                    title={stat.question_prompt}
                                  >
                                    {stat.question_prompt || "Question"}
                                  </span>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                                    correctPct >= 0.7
                                      ? "bg-green-100 text-green-800"
                                      : correctPct >= 0.4
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {correctRate.toFixed(1)}% correct
                                </span>
                              </div>

                              {/* Visual progress bar */}
                              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    correctPct >= 0.7
                                      ? "bg-gradient-to-r from-green-400 to-green-500"
                                      : correctPct >= 0.4
                                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                                        : "bg-gradient-to-r from-red-400 to-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(correctRate, 100)}%`,
                                  }}
                                />
                              </div>

                              <div className="flex gap-6 text-sm text-gray-600">
                                <span>
                                   Correct:{" "}
                                  <strong className="text-green-700">
                                    {stat.correct_answers || 0}
                                  </strong>
                                </span>
                                <span>
                                   Wrong:{" "}
                                  <strong className="text-red-700">
                                    {wrongAnswers}
                                  </strong>
                                </span>
                                <span>
                                   Total:{" "}
                                  <strong>{stat.total_answers || 0}</strong>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/*  CAMERA SCANNER DIALOG */}
          <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  Scan Answer Sheet
                </DialogTitle>
                <DialogDescription>
                  Point your camera at the answer sheet. The system will
                  auto-detect the 4 corner markers and capture.
                </DialogDescription>
              </DialogHeader>

              {cameraUploading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-lg font-medium text-blue-700">
                    Processing answer sheet...
                  </p>
                  <p className="text-sm text-gray-500">
                    Detecting MSSV, variant code, and grading answers
                  </p>
                </div>
              ) : (
                <CameraScanner
                  onCapture={async (blob) => {
                    try {
                      setCameraUploading(true);
                      const file = new File([blob], "camera_scan.jpg", {
                        type: "image/jpeg",
                      });
                      const formData = new FormData();
                      formData.append("test_id", test_id);
                      formData.append("submission_image", file);
                      const result = await uploadSubmission(formData);
                      
                      setIsCameraOpen(false);
                      setCameraUploading(false);
                      
                      setBatchResults({
                        summary: { total: 1, success: 1, failed: 0 },
                        results: [{
                          index: 0,
                          filename: "Camera Capture",
                          status: "success",
                          detected_mssv: result.detected_mssv,
                          variant_code: result.variant_code,
                          total_score: result.total_score,
                          submission_image: result.submission_image
                        }]
                      });
                      setCurrentImageIndex(0);
                      setTimeout(() => {
                        setIsAddSubmissionDialogOpen(true);
                      }, 50);
                      
                      refreshSubmissions();
                    } catch (err) {
                      setCameraUploading(false);
                      alert(
                        "Error: " +
                          (err.message ||
                            "Failed to process submission. Please try again."),
                      );
                    }
                  }}
                  onClose={() => setIsCameraOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
