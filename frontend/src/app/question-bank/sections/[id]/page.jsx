"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  Filter,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Check,
  Minus,
} from "lucide-react";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import QuestionDetailContent from "@/components/questions/QuestionDetailContent";
import Notification from "@/components/common/Notification";

const QUESTION_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "MC", label: "Multiple Choice" },
  { value: "TFE", label: "True/False" },
  { value: "ORD", label: "Ordering" },
  { value: "FIB", label: "Fill in Blank" },
];

const MANUAL_QUESTION_TYPES = QUESTION_TYPES.filter((type) => type.value !== "ALL");

const createDefaultOptions = (type) => {
  if (type === "FIB") return [];

  const baseOptions =
    type === "ORD"
      ? ["First item", "Second item", "Third item"]
      : ["", "", "", ""];

  return baseOptions.map((text, index) => ({
    text,
    is_correct_bool: type === "MC" ? index === 0 : type === "TFE" ? true : null,
    correct_order: type === "ORD" ? index + 1 : null,
    order: index,
  }));
};

const createDefaultManualQuestion = (type = "MC") => ({
  question_type: type,
  prompt: "",
  image: "",
  correct_answer_text: "",
  options: createDefaultOptions(type),
});

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
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

 // Upload states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

 // Manual create states
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualQuestion, setManualQuestion] = useState(createDefaultManualQuestion());
  const [manualImageFile, setManualImageFile] = useState(null);
  const [manualImagePreviewUrl, setManualImagePreviewUrl] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState(null);

 // Delete states
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
 // Warning Modal state
  const [warningModal, setWarningModal] = useState({ open: false, message: "", questionId: null, isBulk: false });

  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    if (!manualImageFile) {
      setManualImagePreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(manualImageFile);
    setManualImagePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [manualImageFile]);

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

  const totalPages = Math.ceil(filteredQuestions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentQuestions = filteredQuestions.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleDelete = async (questionId) => {
    try {
      await QuestionBankService.deleteQuestion(questionId);
      showNotification("Question deleted successfully!");
      loadQuestions();
    } catch (error) {
      if (error.response?.status === 409) {
         setWarningModal({ open: true, message: error.response.data.error, questionId, isBulk: false });
      } else if (error.response?.status === 400 && error.response?.data?.error) {
         showNotification(error.response.data.error, "error");
      } else {
         showNotification("Failed to delete question: " + error.message, "error");
      }
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
      showNotification("Selected questions deleted successfully!");
      await loadQuestions();
    } catch (error) {
      if (error.response?.status === 409) {
         setWarningModal({ open: true, message: error.response.data.error, questionId: null, isBulk: true });
         return;
      }
      const msg =
        error.response?.data?.error ||
        error.message ||
        "Failed to delete questions";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmForceDelete = async () => {
      try {
          if (warningModal.isBulk) {
            if (selectedIds.length === 1) {
              await QuestionBankService.deleteQuestion(selectedIds[0], true);
            } else {
              await QuestionBankService.bulkDeleteQuestions(selectedIds, true);
            }
            setSelectedIds([]);
            showNotification("Selected questions deleted successfully!");
          } else {
            await QuestionBankService.deleteQuestion(warningModal.questionId, true);
            showNotification("Question deleted successfully!");
          }
          setWarningModal({ open: false, message: "", questionId: null, isBulk: false });
          loadQuestions();
      } catch (err) {
         showNotification("Force delete failed: " + err.message, "error");
      }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);

 // We'll use the API directly here to handle the specific errors for this dialog
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("section_id", id);

 // Client-side file size validation (10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (uploadFile.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit. Please use a smaller file.`);
      }

      const response = await QuestionBankService.uploadQuestions(formData);
      setUploadResult(response.data);
      
      if (response.data.created_count > 0) {
        showNotification(response.data.message || "Questions uploaded successfully!");
        await loadQuestions();
      }
    } catch (err) {
      let errorMsg;
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = "Upload timed out. The file may be too large or the server is busy.";
      } else if (err.response?.data) {
        const data = err.response.data;
        errorMsg = data.error || data.detail || "Failed to upload questions";
        
 // Show structured error results even on failure
        setUploadResult({
          created_count: 0,
          skipped_count: 0,
          validation_errors: data.validation_errors || [],
          errors: data.errors || [],
          message: errorMsg,
        });
      } else {
        errorMsg = err.message || "Failed to upload questions";
      }
      
      setUploadError(errorMsg);
      showNotification("Failed to upload questions: " + errorMsg, "error");
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

  const closeManualDialog = () => {
    setIsManualOpen(false);
    setManualQuestion(createDefaultManualQuestion());
    setManualImageFile(null);
    setManualImagePreviewUrl("");
    setManualError(null);
  };

  const handleManualTypeChange = (questionType) => {
    setManualQuestion((prev) => ({
      ...createDefaultManualQuestion(questionType),
      image: prev.image,
    }));
    setManualError(null);
  };

  const updateManualOption = (index, updates) => {
    setManualQuestion((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...updates } : option,
      ),
    }));
  };

  const addManualOption = () => {
    setManualQuestion((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          text: "",
          is_correct_bool: prev.question_type === "TFE" ? true : false,
          correct_order: prev.question_type === "ORD" ? prev.options.length + 1 : null,
          order: prev.options.length,
        },
      ],
    }));
  };

  const removeManualOption = (index) => {
    setManualQuestion((prev) => ({
      ...prev,
      options: prev.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          order: optionIndex,
          correct_order:
            prev.question_type === "ORD"
              ? optionIndex + 1
              : option.correct_order,
        })),
    }));
  };

  const validateManualQuestion = () => {
    const prompt = manualQuestion.prompt.trim();
    if (!prompt) return "Question prompt is required.";

    if (manualImageFile) {
      if (!manualImageFile.type.startsWith("image/")) {
        return "Only image files are accepted.";
      }
      if (manualImageFile.size > 5 * 1024 * 1024) {
        return "Image size must be 5MB or smaller.";
      }
    }

    if (manualQuestion.question_type === "FIB") {
      return manualQuestion.correct_answer_text.trim()
        ? null
        : "Correct answer is required for fill-in-the-blank questions.";
    }

    const filledOptions = manualQuestion.options.filter((option) => option.text.trim());
    if (filledOptions.length < 2) return "Please enter at least two options/statements.";

    if (manualQuestion.question_type === "MC") {
      return filledOptions.some((option) => option.is_correct_bool)
        ? null
        : "Please mark at least one correct answer.";
    }

    if (manualQuestion.question_type === "ORD") {
      const orders = filledOptions.map((option) => Number(option.correct_order));
      const uniqueOrders = new Set(orders);
      const validOrders = orders.every((order) => Number.isInteger(order) && order >= 1);
      const isSequentialFromOne =
        validOrders &&
        uniqueOrders.size === orders.length &&
        orders.every((order) => order <= filledOptions.length) &&
        Array.from({ length: filledOptions.length }, (_, index) => index + 1).every(
          (expectedOrder) => uniqueOrders.has(expectedOrder),
        );

      return isSequentialFromOne
        ? null
        : `Ordering positions must be consecutive from 1 to ${filledOptions.length}.`;
    }

    return null;
  };

  const handleCreateManualQuestion = async () => {
    const validationError = validateManualQuestion();
    if (validationError) {
      setManualError(validationError);
      return;
    }

    try {
      setManualSaving(true);
      setManualError(null);

      let imageUrl = manualQuestion.image;
      if (manualImageFile) {
        const imageFormData = new FormData();
        imageFormData.append("image", manualImageFile);
        const imageResponse = await QuestionBankService.uploadQuestionImage(imageFormData);
        imageUrl = imageResponse.data.image_url;
      }

      const payload = {
        section: Number(id),
        question_type: manualQuestion.question_type,
        prompt: manualQuestion.prompt.trim(),
        image: imageUrl || null,
      };

      if (manualQuestion.question_type === "FIB") {
        payload.correct_answer_text = manualQuestion.correct_answer_text.trim();
      } else {
        payload.options = manualQuestion.options
          .filter((option) => option.text.trim())
          .map((option, index) => ({
            text: option.text.trim(),
            is_correct_bool:
              manualQuestion.question_type === "MC" || manualQuestion.question_type === "TFE"
                ? Boolean(option.is_correct_bool)
                : null,
            correct_order:
              manualQuestion.question_type === "ORD"
                ? Number(option.correct_order)
                : null,
            order: index,
          }));
      }

      await QuestionBankService.createQuestion(payload);
      showNotification("Question created successfully!");
      closeManualDialog();
      await loadQuestions();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to create question";
      setManualError(msg);
      showNotification("Failed to create question: " + msg, "error");
    } finally {
      setManualSaving(false);
    }
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
                    onClick={() => {
                      window.dispatchEvent(new Event('navigation-start')),
                      router.push(`/question-bank/sections/${id}/trash`)}}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 cursor-pointer px-3"
                    title="Trash"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setIsManualOpen(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
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
                    Add a question manually or upload a Word document
                  </p>
                  <Button
                    onClick={() => setIsManualOpen(true)}
                    className="mt-4 mr-2 bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-4 bg-green-600 hover:bg-green-700 cursor-pointer"
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
                <>
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
                      {currentQuestions.map((question, index) => {
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
                                {startIndex + index + 1}
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
                
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="gap-1 text-sm cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      className="gap-1 text-sm cursor-pointer"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Question Dialog */}
      <Dialog open={isManualOpen} onOpenChange={(open) => (open ? setIsManualOpen(true) : closeManualDialog())}>
        <DialogContent className="sm:max-w-[960px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Question Manually</DialogTitle>
            {sectionInfo && (
              <p className="text-sm text-gray-500">
                Adding to:{" "}
                <span className="font-medium text-indigo-600">
                  {sectionInfo.subject} - {sectionInfo.chapter} - {sectionInfo.name}
                </span>
              </p>
            )}
          </DialogHeader>

          {manualError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{manualError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
              <div>
                <Label htmlFor="manualType">Question Type *</Label>
                <select
                  id="manualType"
                  value={manualQuestion.question_type}
                  onChange={(event) => handleManualTypeChange(event.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 cursor-pointer"
                >
                  {MANUAL_QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="manualImage">Question Image</Label>
                <Input
                  key={manualImageFile ? "manual-image-selected" : "manual-image-empty"}
                  id="manualImage"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setManualImageFile(event.target.files?.[0] || null);
                    setManualQuestion((prev) => ({ ...prev, image: "" }));
                  }}
                  className="mt-1 cursor-pointer"
                />
                {manualImagePreviewUrl ? (
                  <div className="mt-3 flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <img
                      src={manualImagePreviewUrl}
                      alt="Question image preview"
                      className="h-24 w-32 rounded-md border border-gray-200 bg-white object-contain"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="truncate text-sm font-medium text-gray-700">
                        {manualImageFile?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {((manualImageFile?.size || 0) / 1024 / 1024).toFixed(2)}MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setManualImageFile(null)}
                        className="h-8 cursor-pointer"
                      >
                        Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Optional. JPG, PNG, GIF, or WebP up to 5MB.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manualPrompt">Question Prompt *</Label>
              <Textarea
                id="manualPrompt"
                value={manualQuestion.prompt}
                onChange={(event) =>
                  setManualQuestion((prev) => ({ ...prev, prompt: event.target.value }))
                }
                placeholder="Enter the question content"
                rows={8}
                maxLength={20000}
                style={{ fieldSizing: "fixed" }}
                className="min-h-52 w-full max-w-full resize-y leading-relaxed"
              />
            </div>

            {manualQuestion.question_type === "FIB" ? (
              <div className="space-y-2">
                <Label htmlFor="manualCorrectText">Correct Answer *</Label>
                <Textarea
                  id="manualCorrectText"
                  value={manualQuestion.correct_answer_text}
                  onChange={(event) =>
                    setManualQuestion((prev) => ({
                      ...prev,
                      correct_answer_text: event.target.value,
                    }))
                  }
                  placeholder="Enter the expected answer"
                  rows={4}
                  maxLength={5000}
                  style={{ fieldSizing: "fixed" }}
                  className="min-h-32 w-full max-w-full resize-y leading-relaxed"
                />
                <p className="text-xs text-gray-500">
                  You can store multiple accepted answers by separating them with commas. Example: Hanoi, Ha Noi, Hà Nội
                </p>
              </div>
            ) : (
              <div className="space-y-7 pt-1">
                <div className="flex items-center justify-between border-t border-gray-100 pt-6 pb-2">
                  <Label>
                    {manualQuestion.question_type === "TFE"
                      ? "Statements"
                      : manualQuestion.question_type === "ORD"
                        ? "Items"
                        : "Answer Options"}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addManualOption}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-10">
                {manualQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 ${
                      index > 0 ? "mt-8" : ""
                    }`}
                  >
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">
                        Option {index + 1}
                      </Label>
                      <Textarea
                        value={option.text}
                        onChange={(event) => updateManualOption(index, { text: event.target.value })}
                        placeholder={`Option ${index + 1}`}
                        rows={3}
                        maxLength={10000}
                        style={{ fieldSizing: "fixed" }}
                        className="min-h-24 w-full max-w-full resize-y bg-white leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                      {manualQuestion.question_type === "ORD" ? (
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">
                            Correct position
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={option.correct_order ?? ""}
                            onChange={(event) =>
                              updateManualOption(index, {
                                correct_order: event.target.value ? Number(event.target.value) : "",
                              })
                            }
                            className="w-36 bg-white"
                          />
                        </div>
                      ) : manualQuestion.question_type === "TFE" ? (
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">
                            Correct value
                          </Label>
                          <select
                            value={option.is_correct_bool ? "true" : "false"}
                            onChange={(event) =>
                              updateManualOption(index, {
                                is_correct_bool: event.target.value === "true",
                              })
                            }
                            className="w-40 h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        </div>
                      ) : (
                        <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(option.is_correct_bool)}
                            onChange={(event) =>
                              updateManualOption(index, {
                                is_correct_bool: event.target.checked,
                              })
                            }
                            className="h-4 w-4"
                          />
                          Correct answer
                        </label>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeManualOption(index)}
                          disabled={manualQuestion.options.length <= 2}
                          className="h-10 px-3 cursor-pointer"
                          title="Remove option"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeManualDialog} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={handleCreateManualQuestion}
              disabled={manualSaving}
              className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              {manualSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          {uploadError && !uploadResult && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Result Display */}
          {uploadResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{uploadResult.created_count || 0}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">{uploadResult.skipped_count || 0}</p>
                  <p className="text-xs text-amber-600">Duplicates</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-700">
                    {(uploadResult.validation_errors?.length || 0) + (uploadResult.errors?.length || 0)}
                  </p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>

              {/* Validation Errors */}
              {uploadResult.validation_errors?.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-red-800">
                    ️ Validation Errors ({uploadResult.validation_errors.length})
                  </h4>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {uploadResult.validation_errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-700 bg-white rounded px-3 py-2 border border-red-100">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Processing Errors */}
              {uploadResult.errors?.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-orange-800">
                    Processing Errors ({uploadResult.errors.length})
                  </h4>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {uploadResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-orange-700 bg-white rounded px-3 py-2 border border-orange-100">
                        {typeof err === 'string' ? err : err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.created_count > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800 text-sm">
                     {uploadResult.message || `${uploadResult.created_count} question(s) created successfully!`}
                  </AlertDescription>
                </Alert>
              )}
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
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500"> Formats: English & Vietnamese auto-detected</p>
                  <p className="text-xs text-gray-500"> Max size: 10MB</p>
                  <p className="text-xs text-gray-500">️ Images in Word are supported (placed after question, before options)</p>
                  <p className="text-xs text-gray-400"> Duplicate questions will be automatically skipped</p>
                </div>
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

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      {/* Force Delete Warning Modal */}
      <Dialog open={warningModal.open} onOpenChange={(open) => !open && setWarningModal({ ...warningModal, open: false })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">{warningModal.message}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWarningModal({ ...warningModal, open: false })}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmForceDelete}
              className="cursor-pointer"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
