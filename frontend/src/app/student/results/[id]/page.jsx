"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // ✅ Import Button
import { Loader2, Award, ArrowLeft } from "lucide-react"; // ✅ Import ArrowLeft
import { useOnlineExam } from "@/hooks/useOnlineExam";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";

export default function ExamResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getExamAttempt } = useOnlineExam();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // ✅ Hàm xử lý quay lại
  const handleGoBack = () => {
    // Thay đổi đường dẫn này nếu trang pending của bạn khác
    router.push("/student/pending"); 
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
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

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-200 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="flex flex-col items-center bg-green-50/50 pb-2">
            <div className="p-3 bg-green-100 rounded-full mb-3">
                <Award className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Exam Completed!
            </CardTitle>
            <p className="text-sm text-green-600 font-medium">
                {result.exam_detail?.title}
            </p>
          </CardHeader>
          
          <CardContent className="py-8 flex flex-col items-center">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-semibold">Your Final Score</p>
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg shadow-green-200">
                <div className="text-center text-white">
                    <p className="text-4xl font-bold">
                        {result.final_score?.toFixed(2)}
                    </p>
                    <p className="text-sm opacity-90 border-t border-green-400 mt-1 pt-1">
                        out of 10
                    </p>
                </div>
              </div>
            </div>

            {/* ✅ Nút Back được thêm vào đây */}
            <Button 
                onClick={handleGoBack}
                className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pending Tests
            </Button>

          </CardContent>
        </Card>
      </div>
    </>
  );
}