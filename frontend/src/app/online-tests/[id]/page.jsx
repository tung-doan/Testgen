"use client";
import { useState, useEffect, use, Fragment } from "react";
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
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import OnlineTestDetailLoading from "./loading";
import OnlineExamService from "@/services/onlineExam.service";
import QuestionDetailContent from "@/components/questions/QuestionDetailContent";
import SubmissionsDialog from "@/components/exam/SubmissionsDialog";
import {
  ArrowLeft,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ExamDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  useEffect(() => {
    loadExamDetail();
  }, [id]);

  const loadExamDetail = async () => {
    try {
      setLoading(true);
      const [examData, questionsData] = await Promise.all([
        OnlineExamService.getExamDetail(id),
        OnlineExamService.getExamQuestions(id),
      ]);
      setExam(examData);
      setQuestions(questionsData);
    } catch (err) {
      console.error("Error loading exam:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      MC: "bg-blue-100 text-blue-800",
      TFE: "bg-green-100 text-green-800",
      ORD: "bg-purple-100 text-purple-800",
      FIB: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };


  if (loading) {
    return <OnlineTestDetailLoading />;
  }

  if (!exam) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <p>Exam not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-0 shadow-xl overflow-hidden mb-4 !p-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-0 m-0">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => router.back()}
                      className="text-white hover:bg-white/20"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <CardTitle className="text-3xl">{exam.title}</CardTitle>
                      <p className="text-blue-100 mt-1">Exam Details</p>
                    </div>
                  </div>
                  <SubmissionsDialog examId={id} examTitle={exam.title} />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Questions */}
          <Card className="border-0 shadow-xl !p-0">
            <CardHeader className="border-b bg-gray-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 p-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Questions ({questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Order</TableHead>
                      <TableHead className="font-bold">Question</TableHead>
                      <TableHead className="font-bold text-center">
                        Type
                      </TableHead>
                      <TableHead className="font-bold text-center">
                        Options
                      </TableHead>
                      <TableHead className="font-bold text-center">
                        Points
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q) => {
                      const detail = q.question;
                      const optionsCount =
                        detail?.answer_options?.length ||
                        detail?.options?.length ||
                        0;
                      const isExpanded = expandedQuestionId === q.id;

                      return (
                        <Fragment key={q.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-blue-50/60"
                            onClick={() =>
                              setExpandedQuestionId((prev) =>
                                prev === q.id ? null : q.id,
                              )
                            }
                          >
                            <TableCell>
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                {q.order}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="line-clamp-2">
                                {detail?.prompt || "Question"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={getTypeColor(detail?.question_type)}
                              >
                                {detail?.question_type_display}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span>{optionsCount}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {q.points}
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-gray-50">
                                <QuestionDetailContent
                                  question={{
                                    ...detail,
                                    options:
                                      detail?.answer_options ||
                                      detail?.options ||
                                      [],
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
