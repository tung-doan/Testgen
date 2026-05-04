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

import { Alert, AlertDescription } from "@/components/ui/alert";
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

  // State
  const [testName, setTestName] = useState("");
  const [testData, setTestData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Statistics modal
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Camera scanner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [openingTestDetail, setOpeningTestDetail] = useState(false);

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

  // Silent refresh (no skeleton flash)
  const refreshSubmissions = async () => {
    try {
      const data = await getSubmissionSummary(test_id);
      setSubmissions(data);
      setFilteredSubmissions(data);
      setError(null);
    } catch (err) {
      console.error("Error refreshing submissions:", err);
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
    setIsAddSubmissionDialogOpen(true);
    setSubmissionImages([]);
    setUploadError(null);
    setBatchResults(null);
    setBatchProgress("");
  };

  const handleImagesChange = (e) => {
    if (e.target.files.length > 0) {
      setSubmissionImages(Array.from(e.target.files));
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
        // Single file → use existing endpoint
        const formData = new FormData();
        formData.append("test_id", test_id);
        formData.append("submission_image", submissionImages[0]);
        const result = await uploadSubmission(formData);

        setBatchResults({
          results: [
            {
              index: 0,
              filename: submissionImages[0].name,
              status: "success",
              detected_mssv: result.detected_mssv || "",
              variant_code: result.variant_code || "",
              total_score: result.total_score,
            },
          ],
          summary: { total: 1, success: 1, failed: 0 },
        });
      } else {
        // Multiple files → use batch endpoint
        setBatchProgress(`Uploading ${submissionImages.length} images...`);
        const formData = new FormData();
        formData.append("test_id", test_id);
        submissionImages.forEach((file) => {
          formData.append("submission_images", file);
        });
        const result = await uploadBatchSubmission(formData);
        setBatchResults(result);
      }

      setSubmissionImages([]);
      refreshSubmissions();
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
      refreshSubmissions();
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

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentSubmissions = filteredSubmissions.slice(
    indexOfFirstRow,
    indexOfLastRow,
  );
  const totalPages = Math.ceil(filteredSubmissions.length / rowsPerPage);

  if (loading && submissions.length === 0) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
          <div className="max-w-7xl mx-auto">
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
              <div className="flex items-center justify-between p-4">
                <div>
                  <CardTitle className="text-2xl font-semibold">
                    {testName} - Submissions
                  </CardTitle>
                  <p className="text-green-100 mt-1">
                    Total: {filteredSubmissions.length} submission
                    {filteredSubmissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleViewTestDetail}
                    className="bg-white text-green-700 hover:bg-green-50"
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
                    className="bg-emerald-500 hover:bg-emerald-600"
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
                    onClick={handleAddSubmission}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <Button
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scan with Camera
                  </Button>
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
                    animation: 'progressSlide 1.5s ease-in-out infinite',
                    width: '40%',
                  }}
                />
              </div>
              <p className="text-xs text-emerald-700 mt-2 animate-pulse">
                Preparing test details...
              </p>
              <style jsx>{`
                @keyframes progressSlide {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(150%); }
                  100% { transform: translateX(250%); }
                }
              `}</style>
            </div>
          )}

          {/* Submissions Table */}
          <Card className="w-full shadow-xl border-0">
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by MSSV, student name, or variant code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                          Student Name
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
                          <TableCell className="text-sm text-gray-600">
                            {submission.student_name || "-"}
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
                              <Button
                                variant="link"
                                onClick={() =>
                                  handleSubmissionClick(submission)
                                }
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View Image
                              </Button>
                            ) : (
                              <span className="text-gray-400">No image</span>
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
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <span className="px-4 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                      >
                        Next
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
                setBatchResults(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
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
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {/* Batch Results — shown after processing */}
                {batchResults && (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded-lg border ${
                        batchResults.summary.failed === 0
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <p className="font-semibold text-sm">
                        {batchResults.summary.success}/
                        {batchResults.summary.total} graded successfully
                        {batchResults.summary.failed > 0 && (
                          <span className="text-red-600 ml-1">
                            ({batchResults.summary.failed} failed)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {batchResults.results.map((r, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${
                            r.status === "success"
                              ? "bg-green-50 border-green-200"
                              : "bg-red-50 border-red-200"
                          }`}
                        >
                          <span className="mt-0.5">
                            {r.status === "success" ? "✅" : "❌"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{r.filename}</p>
                            {r.status === "success" ? (
                              <p className="text-green-700">
                                MSSV: {r.detected_mssv || "—"} · Variant:{" "}
                                {r.variant_code || "—"} · Score: {r.total_score}
                                /10
                              </p>
                            ) : (
                              <p className="text-red-700">{r.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File picker — hidden after results are shown */}
                {!batchResults && (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
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
                        className="cursor-pointer h-12"
                      />
                      {submissionImages.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
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
                      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
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
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitSubmission}
                      disabled={uploadLoading || submissionImages.length === 0}
                      className="bg-green-600 hover:bg-green-700 px-6"
                    >
                      {uploadLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
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

          {/* Statistics Modal (giữ nguyên) */}
          <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Question Statistics</DialogTitle>
                <DialogDescription>
                  Detailed analysis of student performance per question
                </DialogDescription>
              </DialogHeader>

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
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600">
                            Total Submissions
                          </p>
                          <p className="text-2xl font-bold">
                            {statsData.total_submissions}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600">Average Score</p>
                          <p className="text-2xl font-bold text-green-600">
                            {statsData.average_score?.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600">
                            Avg Correct Rate
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {statsData.average_correct_rate?.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-3">
                      {statsData.question_stats?.map((stat) => (
                        <Card key={stat.question_number}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">
                                Question {stat.question_number}
                              </h4>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  stat.correct_percentage >= 0.7
                                    ? "bg-green-100 text-green-800"
                                    : stat.correct_percentage >= 0.4
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {(stat.correct_percentage * 100).toFixed(1)}%
                                correct
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">
                                  Correct: {stat.correct_count}
                                </p>
                                <p className="text-gray-600">
                                  Wrong: {stat.wrong_count}
                                </p>
                              </div>
                              {stat.common_wrong_answer && (
                                <div>
                                  <p className="text-gray-600">
                                    Most common wrong answer:
                                  </p>
                                  <p className="font-semibold text-red-600">
                                    {stat.common_wrong_answer}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ✅ CAMERA SCANNER DIALOG */}
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
                      alert(
                        `Graded successfully!\n\nMSSV: ${result.detected_mssv || "N/A"}\nVariant: ${result.variant_code || "N/A"}\nScore: ${result.total_score}/10`,
                      );
                      window.location.reload();
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
