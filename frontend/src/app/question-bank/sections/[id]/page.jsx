"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { TableSkeleton } from "@/components/ui/skeletons";
import QuestionBankService from "@/services/questionBank.service";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
  Filter,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Check,
  Minus,
} from "lucide-react";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import QuestionDetailContent from "@/components/questions/QuestionDetailContent";

const QUESTION_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "MC", label: "Multiple Choice" },
  { value: "TFE", label: "True/False" },
  { value: "ORD", label: "Ordering" },
  { value: "FIB", label: "Fill in Blank" },
];

export default function SectionQuestions({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Upload states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Delete states
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, [id]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await QuestionBankService.getSectionQuestions(id);
      setQuestions(response.data);

      // Get section info from first question or fetch separately
      if (response.data.length > 0) {
        const firstQuestion = response.data[0];
        setSectionInfo({
          name: firstQuestion.section_name,
          chapter: firstQuestion.chapter_name,
          subject: firstQuestion.subject_name,
        });
      }
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo for performance
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !searchTerm ||
        q.prompt.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "ALL" || q.question_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [questions, searchTerm, filterType]);

  const handleDelete = async (questionId) => {
    try {
      await QuestionBankService.deleteQuestion(questionId);
      loadQuestions();
    } catch (error) {
      alert("Failed to delete question: " + error.message);
      throw error;
    }
  };

  const toggleSelectRow = (questionId) => {
    setSelectedIds((prev) => {
      return prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId];
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      if (selectedIds.length === 1) {
        await QuestionBankService.deleteQuestion(selectedIds[0]);
      } else {
        await QuestionBankService.bulkDeleteQuestions(selectedIds);
      }
      setSelectedIds([]);
      await loadQuestions();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.message ||
        "Failed to delete questions";
      setDeleteError(msg);
      throw error; // Rethrow for DeleteConfirmButton to handle loading state
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("section_id", id);

      const response = await QuestionBankService.uploadQuestions(formData);
      setUploadResult(response.data);

      // Reload questions
      await loadQuestions();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.details?.join(", ") ||
        error.message;
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const closeUploadDialog = () => {
    setIsUploadOpen(false);
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
  };

  const getTypeColor = (type) => {
    const colors = {
      MC: "bg-blue-100 text-blue-800",
      TFE: "bg-green-100 text-green-800",
      ORD: "bg-purple-100 text-purple-800",
      FIB: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="rounded-xl overflow-hidden shadow-xl bg-white">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-6">
                <div className="h-10 w-56 bg-white/20 rounded animate-pulse mb-3" />
                <div className="h-4 w-72 bg-white/20 rounded animate-pulse" />
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-xl overflow-hidden">
              <div className="h-14 bg-gray-100 border-b" />
              <TableSkeleton rows={8} cols={5} />
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl overflow-hidden !p-0">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-0 m-0">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-white hover:bg-white/20 hover:cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <CardTitle className="text-2xl">
                      {sectionInfo ? sectionInfo.name : "Questions"}
                    </CardTitle>
                    {sectionInfo && (
                      <p className="text-indigo-100 mt-1">
                        {sectionInfo.subject} → {sectionInfo.chapter}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedIds.length > 0 && (
                    <DeleteConfirmButton
                      onConfirm={handleBulkDelete}
                      title={selectedIds.length === 1 ? "Delete Question" : "Delete Questions"}
                      description={
                        selectedIds.length === 1
                          ? "Are you sure you want to delete this question? This action cannot be undone."
                          : `Are you sure you want to delete ${selectedIds.length} questions? This action cannot be undone.`
                      }
                      buttonText={`Delete (${selectedIds.length})`}
                      className="bg-red-500/80 hover:bg-red-600 text-white border border-red-400/50 cursor-pointer h-10 px-4 text-sm"
                    />
                  )}
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full sm:w-48 h-10 pl-10 pr-4 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 cursor-pointer appearance-none"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delete Error */}
              {deleteError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}

              {/* Results count */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">
                    Showing{" "}
                    <span className="font-semibold text-gray-800">
                      {filteredQuestions.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-800">
                      {questions.length}
                    </span>{" "}
                    questions
                  </p>
                  {selectedIds.length > 0 && (
                    <Badge className="bg-indigo-100 text-indigo-700">
                      {selectedIds.length} selected
                    </Badge>
                  )}
                </div>
                {(searchTerm || filterType !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("ALL");
                    }}
                    className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No questions in this section yet</p>
                  <p className="text-sm mt-2">
                    Upload a Word document to add questions
                  </p>
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions
                  </Button>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">No questions match your filters</p>
                  <p className="text-sm mt-2">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <div
                            className="flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectAll();
                            }}
                          >
                            {selectedIds.length === 0 ? (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                            ) : selectedIds.length ===
                              filteredQuestions.length ? (
                              <Check className="w-5 h-5 text-indigo-600 bg-indigo-100 rounded" />
                            ) : (
                              <Minus className="w-5 h-5 text-indigo-600 bg-indigo-100 rounded" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-16 text-gray-400">No.</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Options</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((question, index) => {
                        const isExpanded = expandedQuestionId === question.id;
                        const isSelected = selectedIds.includes(question.id);

                        return (
                          <Fragment key={question.id}>
                            <TableRow
                              className={`group cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50 hover:bg-indigo-100"
                                  : "hover:bg-indigo-50/60"
                              }`}
                              onClick={() =>
                                setExpandedQuestionId((prev) =>
                                  prev === question.id ? null : question.id,
                                )
                              }
                            >
                              <TableCell
                                className="text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectRow(question.id);
                                }}
                              >
                                <div className="flex items-center justify-center cursor-pointer">
                                  {isSelected ? (
                                    <Check className="w-5 h-5 text-indigo-600" />
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-400 font-mono text-sm">
                                {index + 1}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="line-clamp-2">
                                  {question.prompt}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getTypeColor(
                                    question.question_type,
                                  )}
                                >
                                  {question.question_type_display}
                                </Badge>
                              </TableCell>
                              <TableCell className="relative pr-12">
                                <div className="flex items-center gap-2">
                                  <span>{question.options?.length || 0}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>
                                <div
                                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <DeleteConfirmButton
                                    buttonText=""
                                    onConfirm={() => handleDelete(question.id)}
                                    title="Delete Question"
                                    description="Are you sure you want to delete this question?"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-full shadow-sm"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={5} className="bg-gray-50">
                                  <QuestionDetailContent question={question} />
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Upload Questions from Word Document
            </DialogTitle>
            {sectionInfo && (
              <p className="text-sm text-gray-500">
                Uploading to:{" "}
                <span className="font-medium text-indigo-600">
                  {sectionInfo.subject} → {sectionInfo.chapter} →{" "}
                  {sectionInfo.name}
                </span>
              </p>
            )}
          </DialogHeader>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {uploadResult && (
            <div className="space-y-3">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {uploadResult.message}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {uploadResult.created_count}
                  </p>
                  <p className="text-xs text-blue-600">Created</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {uploadResult.skipped_count || 0}
                  </p>
                  <p className="text-xs text-amber-600">Skipped (Duplicates)</p>
                </div>
              </div>
            </div>
          )}

          {!uploadResult && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="uploadFile">Select .docx file *</Label>
                <Input
                  id="uploadFile"
                  type="file"
                  accept=".docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="cursor-pointer mt-1"
                />
                <p className="text-sm text-gray-500 mt-2">
                  📝 Supported formats: English & Vietnamese
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  🔄 Duplicate questions will be automatically detected and
                  skipped
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeUploadDialog}
              className="cursor-pointer"
            >
              {uploadResult ? "Close" : "Cancel"}
            </Button>
            {!uploadResult && (
              <Button
                onClick={handleUpload}
                className="bg-green-600 hover:bg-green-700 cursor-pointer"
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
