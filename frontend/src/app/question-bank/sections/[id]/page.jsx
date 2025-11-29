"use client";
import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/app/loading";
import QuestionBankService from "@/services/questionBank.service";
import {
  ArrowLeft,
  Eye,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Image from "next/image";

export default function SectionQuestions({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [id]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await QuestionBankService.getSectionQuestions(id);
      setQuestions(response.data);

      // Get section info from first question
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

  const handleViewDetails = (question) => {
    setSelectedQuestion(question);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await QuestionBankService.deleteQuestion(questionId);
      loadQuestions();
    } catch (error) {
      alert("Failed to delete question: " + error.message);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      MULTIPLE_CHOICE: "bg-blue-100 text-blue-800",
      TRUE_FALSE: "bg-green-100 text-green-800",
      ORDERING: "bg-purple-100 text-purple-800",
      FILL_BLANK: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return <LoadingScreen message="Loading questions..." />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="text-white hover:bg-white/20"
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
            </CardHeader>
            <CardContent className="p-6">
              {questions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No questions in this section yet</p>
                  <p className="text-sm mt-2">
                    Upload a Word document to add questions
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell className="max-w-md">
                            <div className="line-clamp-2">
                              {question.prompt}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getTypeColor(question.question_type)}
                            >
                              {question.question_type_display}
                            </Badge>
                          </TableCell>
                          <TableCell>{question.points}</TableCell>
                          <TableCell>{question.options?.length || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(question)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(question.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Question Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              {/* Question Prompt */}
              <div>
                <h3 className="font-semibold mb-2">Question:</h3>
                <p className="text-gray-700">{selectedQuestion.prompt}</p>
              </div>

              {/* Question Image (if exists) */}
              {selectedQuestion.image && (
                <div>
                  <h3 className="font-semibold mb-2">Image:</h3>
                  <Image
                    src={selectedQuestion.image}
                    alt="Question"
                    width={400}
                    height={300}
                    className="rounded border"
                  />
                </div>
              )}

              {/* Answer Section - Different for FILL_IN_BLANK */}
              {selectedQuestion.question_type === "FIB" ? (
                // ✅ Fill in the Blank: Show text answer
                <div>
                  <h3 className="font-semibold mb-2">Correct Answer:</h3>
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-lg font-medium text-green-800">
                        {selectedQuestion.correct_answer_text ||
                          "No answer provided"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // ✅ Multiple Choice / True False / Ordering: Show options
                <div>
                  <h3 className="font-semibold mb-2">Answer Options:</h3>
                  <div className="space-y-2">
                    {selectedQuestion.options &&
                    selectedQuestion.options.length > 0 ? (
                      selectedQuestion.options.map((option, index) => {
                        const isCorrect =
                          option.is_correct_bool === true ||
                          option.score_percentage > 0 ||
                          option.correct_order !== null;

                        return (
                          <div
                            key={option.id}
                            className={`flex items-start gap-2 p-3 border rounded ${
                              isCorrect
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span className="font-bold min-w-[30px]">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="flex-1">{option.text}</span>

                            {/* Show different indicators based on question type */}
                            {selectedQuestion.question_type === "ORD" &&
                            option.correct_order !== null ? (
                              <Badge className="bg-purple-100 text-purple-800">
                                Position: {option.correct_order}
                              </Badge>
                            ) : selectedQuestion.question_type === "TFE" ? (
                              option.is_correct_bool === true ? (
                                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  True
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" />
                                  False
                                </Badge>
                              )
                            ) : isCorrect ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                {option.score_percentage > 0 && (
                                  <Badge className="bg-green-100 text-green-800">
                                    {option.score_percentage}%
                                  </Badge>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No options available
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Explanation (if exists) */}
              {selectedQuestion.explanation && (
                <div>
                  <h3 className="font-semibold mb-2">Explanation:</h3>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
                    {selectedQuestion.explanation}
                  </p>
                </div>
              )}

              {/* Question Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-gray-600 block mb-1">
                    Type:
                  </span>
                  <Badge
                    className={getTypeColor(selectedQuestion.question_type)}
                  >
                    {selectedQuestion.question_type_display}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600 block mb-1">
                    Points:
                  </span>
                  <span className="font-semibold text-lg">
                    {selectedQuestion.points}
                  </span>
                </div>
              </div>

              {/* Additional Info for TFE and ORD */}
              {selectedQuestion.question_type === "TFE" && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This is a True/False Extended
                    question. Each statement can be marked as True or False.
                  </p>
                </div>
              )}

              {selectedQuestion.question_type === "ORD" && (
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <strong>Note:</strong> This is an Ordering question.
                    Students must arrange options in the correct sequence.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
