"use client";
import { useState, useEffect, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
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
import TestDetailLoading from "./loading";
import { useTest } from "@/hooks/useTest";
import QuestionDetailContent from "@/components/questions/QuestionDetailContent";
import { BookOpen, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

export default function TestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getTestById } = useTest();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [selectedVariantCode, setSelectedVariantCode] = useState("original");

  useEffect(() => {
    loadTestData();
  }, [id]);

  const loadTestData = async () => {
    try {
      setLoading(true);
      const data = await getTestById(id);
      setTest(data);
    } catch (err) {
      console.error("Error loading test:", err);
    } finally {
      setLoading(false);
    }
  };

  const paperQuestions = test?.paper_questions || [];
  
  const selectedVariant = test?.variants?.find((v) => v.variant_code === selectedVariantCode);

  const displayQuestions = [...paperQuestions];
  if (selectedVariant) {
    displayQuestions.sort((a, b) => {
      const indexA = selectedVariant.question_order.indexOf(a.question);
      const indexB = selectedVariant.question_order.indexOf(b.question);
      return indexA - indexB;
    });
  }

  if (loading) return <TestDetailLoading />;

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6 ">
          {/* Header Card */}
          <Card className="border-0 shadow-xl !p-0 mb-4">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-3xl">{test?.title}</CardTitle>
                    <p className="text-green-100 mt-2">
                      {test?.variant_count || 0} variant
                      {(test?.variant_count || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Questions List */}
          <Card className="border-0 shadow-xl !p-0">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between p-2 flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  Questions ({test?.num_questions || 0})
                </CardTitle>
                
                {test?.variants && test.variants.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-600">Sort by Variant:</span>
                    <select
                      value={selectedVariantCode}
                      onChange={(e) => setSelectedVariantCode(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium cursor-pointer"
                    >
                      <option value="original">Original Order (Default)</option>
                      {test.variants.map((v) => (
                        <option key={v.id} value={v.variant_code}>
                          Variant {v.variant_code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {test?.paper_questions?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No questions added yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Order</TableHead>
                      <TableHead className="font-bold">Question</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold text-center">
                        Options
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayQuestions.map((pq, index) => {
                      const detail = pq.question_detail || pq.question;
                      const isExpanded = expandedQuestionId === pq.id;
                      const optionsCount = detail?.options?.length || 0;

                      let questionOptions = detail?.options || [];
                      if (selectedVariant && selectedVariant.answer_shuffles) {
                        const shuffleOrder = selectedVariant.answer_shuffles[String(detail.id)];
                        if (shuffleOrder) {
                          questionOptions = shuffleOrder.map((idx) => questionOptions[idx]).filter(Boolean);
                        }
                      }

                      return (
                        <Fragment key={pq.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-emerald-50/60"
                            onClick={() =>
                              setExpandedQuestionId((prev) =>
                                prev === pq.id ? null : pq.id,
                              )
                            }
                          >
                            <TableCell>
                              <Badge className={selectedVariant ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                                {selectedVariant ? index + 1 : pq.order}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="line-clamp-2">
                                {detail?.prompt || "Question"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
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
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-gray-50">
                                <QuestionDetailContent question={{ ...detail, options: questionOptions }} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
