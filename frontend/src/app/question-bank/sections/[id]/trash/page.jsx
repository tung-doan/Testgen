"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { TableSkeleton } from "@/components/ui/skeletons";
import QuestionBankService from "@/services/questionBank.service";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Check,
  Minus,
  RefreshCw,
  Trash2,
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

export default function TrashSectionQuestions({ params }) {
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

  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    loadQuestions();
  }, [id]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await QuestionBankService.getDeletedQuestions(id);
      setQuestions(response.data);

      if (response.data.length > 0) {
        const firstQuestion = response.data[0];
        setSectionInfo({
          name: firstQuestion.section_name,
          chapter: firstQuestion.chapter_name,
          subject: firstQuestion.subject_name,
        });
      }
    } catch (error) {
      console.error("Error loading deleted questions:", error);
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

  const handleRestore = async (questionId) => {
    try {
      await QuestionBankService.restoreQuestion(questionId);
      showNotification("Question restored successfully!");
      loadQuestions();
    } catch (error) {
      const msg = error.response?.status === 404 ? "This question has been permanently deleted." : error.message;
      showNotification("Failed to restore question: " + msg, "error");
    }
  };

  const handlePermanentDelete = async (questionId) => {
    try {
      await QuestionBankService.permanentDeleteQuestion(questionId);
      showNotification("Question permanently deleted!");
      loadQuestions();
    } catch (error) {
      const msg = error.response?.status === 404 ? "This question has already been permanently deleted." : error.message;
      showNotification("Failed to delete question: " + msg, "error");
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

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const qId of selectedIds) {
          await QuestionBankService.restoreQuestion(qId);
      }
      setSelectedIds([]);
      showNotification("Selected questions restored successfully!");
      await loadQuestions();
    } catch (error) {
      const msg = error.response?.status === 404 ? "Some questions have been permanently deleted." : error.message;
      showNotification("Failed to restore some questions: " + msg, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const qId of selectedIds) {
          await QuestionBankService.permanentDeleteQuestion(qId);
      }
      setSelectedIds([]);
      showNotification("Selected questions permanently deleted!");
      await loadQuestions();
    } catch (error) {
      const msg = error.response?.status === 404 ? "Some questions have already been permanently deleted." : error.message;
      showNotification("Failed to delete some questions: " + msg, "error");
      throw error;
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="rounded-xl overflow-hidden shadow-xl bg-white">
              <div className="bg-gray-600 px-6 py-6">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl overflow-hidden !p-0">
            <CardHeader className="bg-gray-700 text-white p-0 m-0">
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
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Trash2 className="h-6 w-6" /> Trash: {sectionInfo ? sectionInfo.name : "Questions"}
                    </CardTitle>
                    {sectionInfo && (
                      <p className="text-gray-300 mt-1">
                        {sectionInfo.subject} → {sectionInfo.chapter}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedIds.length > 0 && (
                    <>
                      <Button
                        onClick={handleBulkRestore}
                        className="bg-green-600 hover:bg-green-700 text-white cursor-pointer h-10 px-4 text-sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restore ({selectedIds.length})
                      </Button>
                      <DeleteConfirmButton
                        onConfirm={handleBulkDelete}
                        title={selectedIds.length === 1 ? "Permanently Delete Question" : "Permanently Delete Questions"}
                        description={
                          selectedIds.length === 1
                            ? "Are you sure you want to permanently delete this question? This action cannot be undone."
                            : `Are you sure you want to permanently delete ${selectedIds.length} questions? This action cannot be undone.`
                        }
                        buttonText={`Delete Permanently (${selectedIds.length})`}
                        className="bg-red-500/80 hover:bg-red-600 text-white border border-red-400/50 cursor-pointer h-10 px-4 text-sm"
                      />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search deleted questions..."
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
                    className="w-full sm:w-48 h-10 pl-10 pr-4 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400 cursor-pointer appearance-none"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    questions in trash
                  </p>
                  {selectedIds.length > 0 && (
                    <Badge className="bg-gray-200 text-gray-700">
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
                    className="text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">Trash is empty</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">No questions match your filters</p>
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
                              <Check className="w-5 h-5 text-gray-600 bg-gray-200 rounded" />
                            ) : (
                              <Minus className="w-5 h-5 text-gray-600 bg-gray-200 rounded" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-16 text-gray-400">No.</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                                  ? "bg-gray-100 hover:bg-gray-200"
                                  : "hover:bg-gray-50"
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
                                    <Check className="w-5 h-5 text-gray-700" />
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-400 font-mono text-sm">
                                {index + 1}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="line-clamp-2 text-gray-600">
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
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestore(question.id);
                                    }}
                                    className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200 cursor-pointer"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <DeleteConfirmButton
                                      buttonText=""
                                      onConfirm={() => handlePermanentDelete(question.id)}
                                      title="Permanently Delete Question"
                                      description="Are you sure you want to permanently delete this question? This action cannot be undone."
                                      className="h-9 w-9 p-0 flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white"
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={5} className="bg-gray-50 opacity-80">
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
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </>
  );
}
