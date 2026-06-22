"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ArrowLeft, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import ResultsLoading from "./loading";
import { useOnlineExam } from "@/hooks/useOnlineExam";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import QuestionResultDisplay from "@/components/exam/QuestionResultDisplay";

export default function ExamResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getExamAttempt } = useOnlineExam();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  useEffect(() => {
    async function fetchResult() {
      try {
        const data = await getExamAttempt(id);
        setResult(data);
      } catch (err) {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [id, getExamAttempt]);

  const handleGoBack = () => {
    window.dispatchEvent(new Event("navigation-start"))
    router.push("/student/pending"); 
  };

  if (loading) {
    return <ResultsLoading />;
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Could not load result.</p>
        <Button variant="outline" onClick={handleGoBack} className="ml-4">
            Go Back
        </Button>
      </div>
    );
  }

  const showResults = result.exam_detail?.show_results_immediately;
  const hasAnswers = result.answers && result.answers.length > 0;

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-green-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Summary Card */}
          <Card className="shadow-2xl border-0 overflow-hidden mb-8 !p-0">
            <CardHeader className="flex flex-col items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8">
              <CardTitle className="text-3xl font-black mb-1">
                Exam Completed!
              </CardTitle>
              <p className="text-lg opacity-90 font-medium">
                  {result.exam_detail?.title}
              </p>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center space-y-4">
                  <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-black mb-8">Your Final Score</p>
                  <div className="relative">
                    {/* Background decorative ring */}
                    <div className="absolute inset-0 rounded-full bg-green-100 scale-125 opacity-50 animate-pulse"></div>
                    <div className="relative inline-flex items-center justify-center w-40 h-40 bg-white border-8 border-green-500 rounded-full shadow-2xl">
                      <div className="text-center">
                          <p className="text-5xl font-black text-green-600">
                              {result.final_score?.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-400 font-bold border-t border-gray-100 mt-1 pt-1">
                              SCALE 10
                          </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Completed At</p>
                        <p className="text-gray-700 font-semibold">
                            {new Date(result.end_time).toLocaleString()}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Duration Taken</p>
                        <p className="text-gray-700 font-semibold">
                            {result.duration_taken} minutes
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status</p>
                        <p className="text-green-600 font-black italic">
                            {result.status}
                        </p>
                    </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Button 
                    onClick={handleGoBack}
                    variant="outline"
                    className="flex-1 h-12 border-2 hover:bg-gray-50 font-bold"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to pending tests
                </Button>
                
                {showResults && hasAnswers && (
                    <Button 
                        onClick={() => setShowDetailedResults(!showDetailedResults)}
                        className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200"
                    >
                        {showDetailedResults ? "Hide Review" : "Review Answers"}
                        {showDetailedResults ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                    </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results Section */}
          {showDetailedResults && showResults && hasAnswers && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-2xl font-black text-gray-800">Review Questions</h3>
              </div>
              
              {result.answers.map((answer, index) => (
                <QuestionResultDisplay 
                  key={answer.id || `unanswered-${answer.question.id}`} 
                  answer={answer} 
                  index={index} 
                />
              ))}

              <div className="py-10 text-center">
                 <Button 
                    onClick={() => {
                        setShowDetailedResults(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    variant="ghost"
                    className="text-gray-400 hover:text-indigo-600"
                 >
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Scroll back to top
                 </Button>
              </div>
            </div>
          )}

          {!showResults && (
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-bold text-blue-900">Result Review Restricted</p>
                        <p className="text-sm text-blue-700">
                            The teacher has disabled immediate result review for this exam. 
                            Please contact your teacher for more information about your answers.
                        </p>
                    </div>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}