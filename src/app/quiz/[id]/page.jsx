"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/UserContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Loader2 } from "lucide-react";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LoadingScreen from "@/app/loading";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar as BarChart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function SubmissionSummary() {
  const { id: test_id, student_id } = useParams(); // Lấy cả test_id và student_id từ URL
  const router = useRouter();
  const [testName, setTestName] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const { user } = useAuth(); // Import useAuth để lấy thông tin người dùng hiện tại

  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [testData, setTestData] = useState(null);
  const [currentBatchStart, setCurrentBatchStart] = useState(1);
  const questionsPerBatch = 10;
  const [answerKeys, setAnswerKeys] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddSubmissionModalOpen, setIsAddSubmissionModalOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [submissionData, setSubmissionData] = useState({
    testId: "",
    submissionImage: null,
  });
  const [uploadError, setUploadError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Thêm state cho modal thống kê câu hỏi
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);


  const fetchSubmissionSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + "api/submissions/submission_summary/",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      let filteredSubmissions = response.data.filter(
        (submission) => submission.test_id === parseInt(test_id)
      );
      // Nếu có student_id, thêm bộ lọc theo student_id
      if (student_id) {
        filteredSubmissions = filteredSubmissions.filter(
          (submission) => submission.student_id === parseInt(student_id)
        );
      }
      setSubmissions(filteredSubmissions);
      setError(null);
    } catch (err) {
      console.error("Error fetching submission summary:", err);
      setError("Failed to load submission summary. Please try again.");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionSummary();
  }, [test_id, student_id]); // Thêm student_id vào dependency để refetch khi thay đổi

  useEffect(() => {
    if (localStorage.getItem("newSubmissionAdded") === "true") {
      fetchSubmissionSummary();
      localStorage.removeItem("newSubmissionAdded");
    }
  }, []);

  // Thêm hàm lấy dữ liệu thống kê câu hỏi
  const fetchQuestionStats = async () => {
    try {
      setLoadingStats(true);
      console.log(`Fetching stats for test ID: ${test_id}`);
      
      // Sửa lại URL endpoint API để phù hợp với cách ViewSet trong Django hoạt động
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}api/statistics/${test_id}/test-question-stats/`,
        {
          withCredentials: true,
        }
      );
      console.log("Response data:", response.data);
      setStatsData(response.data);
      setIsStatsModalOpen(true);
    } catch (err) {
      console.error("Error fetching question statistics:", err);
      // Chi tiết lỗi để debug
      if (err.response) {
        alert(`Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        alert("Failed to load statistics. Please try again.");
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddSubmission = () => {
    setIsAddSubmissionModalOpen(true);
    setParticipantName(user?.username || ""); // Reset participant name
  };

const [loadingAnswerKeys, setLoadingAnswerKeys] = useState(false);

const handleAddKey = async () => {
  setIsAddKeyModalOpen(true);
  setCurrentBatchStart(1);
  setLoadingAnswerKeys(true);
  
  try {
    // Tải đáp án hiện có từ API
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}api/tests/${test_id}/get_answer_keys/`,
      { withCredentials: true }
    );
    
    if (response.data) {
      console.log("API response data:", response.data);
      
      // Kiểm tra cấu trúc dữ liệu trả về
      if (response.data.answer_keys) {
        // Nếu dữ liệu có đối tượng answer_keys lồng nhau, sử dụng nó
        console.log("Using nested answer_keys object:", response.data.answer_keys);
        setAnswerKeys(response.data.answer_keys);
      } else {
        // Nếu không, sử dụng toàn bộ đối tượng response.data
        console.log("Using full response data object:", response.data);
        setAnswerKeys(response.data);
      }
    }
  } catch (err) {
    console.error("Error loading answer keys:", err);
    setAnswerKeys({});
  } finally {
    setLoadingAnswerKeys(false);
  }
};

  const handleAnswerKeyChange = (questionNumber, value) => {
    setAnswerKeys((prev) => ({
      ...prev,
      [questionNumber]: value,
    }));
  };

  const handlePreviousBatch = () => {
    if (currentBatchStart > 1) {
      setCurrentBatchStart(currentBatchStart - questionsPerBatch);
    }
  };

  const handleNextBatch = () => {
    if (currentBatchStart + questionsPerBatch <= testData.num_questions) {
      setCurrentBatchStart(currentBatchStart + questionsPerBatch);
    }
  };

  const handleSubmitKeys = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Convert answerKeys from object to array
      const formattedKeys = Object.entries(answerKeys).map(
        ([question_number, answer]) => ({
          question_number: parseInt(question_number),
          answer,
        })
      );

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}api/tests/${test_id}/save_answer_keys/`,
        { answer_keys: answerKeys },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Answer keys saved:", response.data);
      setIsAddKeyModalOpen(false);
      alert("Answer keys saved successfully!");
    } catch (err) {
      console.error("Error saving answer keys:", err);
      setSaveError(
        "Failed to save answer keys: " +
          (err.response?.data?.detail || err.message)
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      setSubmissionData({
        ...submissionData,
        submissionImage: e.target.files[0],
      });
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (
      window.confirm("Are you sure you want to delete this submission?")
    ) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}api/submissions/${submissionId}/`,
          { withCredentials: true }
        );
        // Refresh the table after deletion
        fetchSubmissionSummary();
        alert("Submission deleted successfully!");
      } catch (err) {
        console.error("Error deleting submission:", err);
        alert(
          "Failed to delete submission: " +
            (err.response?.data?.detail || err.message)
        );
      }
    }
  };


// Sửa lại hàm handleSubmitSubmission để sử dụng submission_id từ API đúng cách
const handleSubmitSubmission = async () => {
  try {
    setUploadLoading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("test_id", submissionData.testId || test_id);
    formData.append("participant_name", participantName);
    formData.append("submission_image", submissionData.submissionImage);

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}api/submissions/upload_submission/`,
      formData,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Submission uploaded:", response.data);
    
    // Lấy đúng ID từ phản hồi API (submission_id thay vì id)
    const submissionId = response.data.submission_id || response.data.id;
    console.log("New submission ID:", submissionId);
    
    // Đóng modal và reset form
    setIsAddSubmissionModalOpen(false);
    setSubmissionData({
      testId: "",
      submissionImage: null,
    });
    
    // Cập nhật localStorage để biết có submission mới khi trang reload
    localStorage.setItem("newSubmissionAdded", "true");
    
    // Hiển thị thông báo thành công
    alert("Submission uploaded successfully! Page will reload to show updated scores.");
    
    // Reload trang ngay lập tức sau khi hiển thị alert
    window.location.reload();
    
  } catch (err) {
    console.error("Error uploading submission:", err);
    setUploadError(
      "Failed to upload submission: " +
        (err.response?.data?.detail || err.message)
    );
  } finally {
    setUploadLoading(false);
  }
};


  const handleSubmissionClick = (submission) => {
    router.push(`http://127.0.0.1:8000${submission.submission_image}`);
  };

  useEffect(() => {
    // Fetch test data for the test
    const fetchTestData = async () => {
      try {
        if (!test_id) return;
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}api/tests/${test_id}/`,
          { withCredentials: true }
        );
        setTestData(response.data);
        setTestName(response.data.title);
      } catch (err) {
        console.error("Error fetching test data:", err);
      }
    };

    fetchTestData();
  }, [test_id]);

  const getChoiceLetters = () => {
    if (!testData || !testData.num_choices) return [];
    return Array.from({ length: testData.num_choices }, (_, i) =>
      String.fromCharCode(65 + i)
    );
  };

  const getCurrentBatchQuestions = () => {
    if (!testData || !testData.num_questions) return [];
    const end = Math.min(
      currentBatchStart + questionsPerBatch - 1,
      testData.num_questions
    );
    const batch = [];
    for (let i = currentBatchStart; i <= end; i++) {
      batch.push(i);
    }
    return batch;
  };

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const totalPages = Math.ceil(sortedSubmissions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentSubmissions = sortedSubmissions.slice(startIndex, endIndex);

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">
              {testName} - Submissions
            </CardTitle>
            <div className="flex gap-2">
              {/* Nút Question Stats có màu xanh lá, phù hợp với chủ đạo */}
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
              <Button onClick={handleAddSubmission} className="bg-green-600 hover:bg-green-700">Add Submission</Button>
              <Button onClick={handleAddKey} className="bg-green-600 hover:bg-green-700">Add Answer Key</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <LoadingScreen />
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No submissions found</p>
                <Button onClick={handleAddSubmission} className="bg-green-600 hover:bg-green-700">
                  Upload your first submission
                </Button>
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">
                        Participant Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Score
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Image
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSubmissions.map((submission, index) => (
                      <TableRow
                        key={submission.id}
                        onClick={() => handleSubmissionClick(submission)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          index === 0 && currentPage === 1 ? "bg-green-50" : ""
                        }`}
                      >
                        <TableCell>
                          {submission.student_name === "N/A" ? submission.participant_name : submission.student_name}
                          {isRecent(submission.created_at) && (
                            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              New
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{submission.score}</TableCell>
                        <TableCell>
                          {new Date(submission.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {submission.submission_image ? (
                            <a
                              href={`http://127.0.0.1:8000${submission.submission_image}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Image
                                src={`http://127.0.0.1:8000${submission.submission_image}`}
                                alt="Submission"
                                width={100}
                                height={100}
                                className="object-cover rounded-md"
                                onError={() =>
                                  console.error(
                                    "Failed to load image:",
                                    submission.submission_image
                                  )
                                }
                              />
                            </a>
                          ) : (
                            <span className="text-gray-500">No Image</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation(); // Ngăn chặn chuyển trang khi nhấn nút Delete
                              handleDeleteSubmission(submission.id);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-2 rounded-lg transition-colors duration-200"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6 gap-2">
                    <Button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 bg-green-600 hover:bg-green-700 ${
                        currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Previous
                    </Button>
                    <span className="text-gray-600 self-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 bg-green-600 hover:bg-green-700 ${
                        currentPage === totalPages
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal thêm đáp án */}
      {/* Modal thêm đáp án */}
<Dialog open={isAddKeyModalOpen} onOpenChange={setIsAddKeyModalOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Add Answer Key</DialogTitle>
      <DialogDescription>
        Define answer keys for test questions
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {saveError && <p className="text-red-600">{saveError}</p>}
      
      {/* Thông báo khi đáp án đã được tải */}
      {Object.keys(answerKeys).length > 0 && (
        <div className="bg-green-50 p-3 mb-4 rounded-md border border-green-200">
          <p className="text-green-800 text-sm">
            ✓ Existing answer keys loaded
          </p>
        </div>
      )}
      
      <p className="text-sm text-gray-600">
        {testData?.num_questions
          ? `Total questions: ${testData.num_questions}`
          : "Loading test data..."}
      </p>

      {loadingAnswerKeys ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
          <span>Loading answer keys...</span>
        </div>
      ) : testData && (
        <>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {getCurrentBatchQuestions().map((qNum) => (
              <div key={qNum} className="p-3 border rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <Label
                    htmlFor={`question_${qNum}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Question {qNum}
                  </Label>
                  {answerKeys[qNum] && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      Current: {answerKeys[qNum]}
                    </span>
                  )}
                </div>

                {/* Custom Radio Button Group */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {getChoiceLetters().map((letter) => {
                    const isSelected = answerKeys[qNum] === letter;
                    return (
                      <button
                        key={`${qNum}_${letter}`}
                        type="button"
                        onClick={() => handleAnswerKeyChange(qNum, letter)}
                        className={`
                          w-8 h-8 flex items-center justify-center rounded-full
                          transition-all duration-200 focus:outline-none
                          ${isSelected 
                            ? "bg-green-600 text-white ring-2 ring-green-400 ring-offset-2" 
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}
                        `}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Thêm nút Save Answer Key ngay sau danh sách câu hỏi */}
          <div className="pt-3 pb-3 border-t mt-3">
            <Button 
              onClick={handleSubmitKeys}
              disabled={isSaving} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Answer Keys...
                </>
              ) : (
                "Save Answer Keys"
              )}
            </Button>
          </div>
        </>
      )}

      {/* Pagination */}
      {testData && testData.num_questions > questionsPerBatch && (
        <div className="flex justify-between mt-4 border-t pt-4">
          <Button
            onClick={handlePreviousBatch}
            disabled={currentBatchStart === 1}
            className="bg-green-600 hover:bg-green-700"
          >
            Previous
          </Button>
          <span className="text-gray-700 self-center">
            {currentBatchStart} - {Math.min(currentBatchStart + questionsPerBatch - 1, testData.num_questions)} of {testData.num_questions}
          </span>
          <Button
            onClick={handleNextBatch}
            disabled={currentBatchStart + questionsPerBatch > testData.num_questions}
            className="bg-green-600 hover:bg-green-700"
          >
            Next
          </Button>
        </div>
      )}
    </div>

    <DialogFooter className="border-t pt-4 mt-2">
      <Button onClick={() => setIsAddKeyModalOpen(false)} variant="outline">
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Modal thêm bài nộp */}
      <Dialog
        open={isAddSubmissionModalOpen}
        onOpenChange={setIsAddSubmissionModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadError && <p className="text-red-600">{uploadError}</p>}
            <div>
              <Label
                htmlFor="participantName"
                className="block text-sm font-medium text-gray-700"
              >
                Participant Name
              </Label>
              <Input
                id="participantName"
                value={participantName}
                disabled
                onChange={(e) => setParticipantName(e.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300"
              />
            </div>

            <div>
        <Label
          htmlFor="testId"
          className="block text-sm font-medium text-gray-700"
        >
          Test Name
        </Label>
        {/* Thay thế Input bằng hiển thị tên test */}
        <div className="mt-1 w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
          {testName || `Test #${test_id}`}
        </div>
      </div>

            <div>
              <Label
                htmlFor="submissionImage"
                className="block text-sm font-medium text-gray-700"
              >
                Upload Image
              </Label>
              <Input
                id="submissionImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 w-full rounded-lg border-gray-300"
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload a clear photo of the completed answer sheet.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsAddSubmissionModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitSubmission} 
              disabled={uploadLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Modal - Hiển thị rộng hơn */}
      <Dialog open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
        <DialogContent 
          style={{ 
            maxWidth: 'min(95vw, 1600px)', 
            width: '95vw',
            maxHeight: '90vh',
            margin: '1rem'
          }} 
          className="overflow-hidden flex flex-col"
        >
          <DialogHeader className="mb-4 border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-green-700">Question Statistics</DialogTitle>
            <DialogDescription className="text-base">
              Detailed analysis of student performance on each question
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-grow">
            {statsData ? (
              <div className="p-2">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-green-700">Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 bg-green-50 border-green-200">
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold">{statsData.average_score?.toFixed(2) || "N/A"}</p>
                    </Card>
                    <Card className="p-4 bg-green-50 border-green-200">
                      <p className="text-sm text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold">{statsData.total_submissions || 0}</p>
                    </Card>
                    <Card className="p-4 bg-green-50 border-green-200">
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold">{statsData.average_correct_rate?.toFixed(2) || 0}%</p>
                    </Card>
                  </div>
                </div>

                {/* Biểu đồ trực quan */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-green-700">Performance Chart</h3>
                  <div style={{ height: '400px' }} className="w-full">
                    {statsData.question_stats && (
                      <BarChart
                        data={{
                          labels: statsData.question_stats.map(q => `Q${q.question_number}`),
                          datasets: [
                            {
                              label: 'Correct %',
                              data: statsData.question_stats.map(q => q.correct_percentage * 100),
                              backgroundColor: 'rgba(72, 187, 120, 0.7)',
                              borderColor: 'rgba(72, 187, 120, 1)',
                              borderWidth: 1,
                            },
                            {
                              label: 'Wrong %',
                              data: statsData.question_stats.map(q => (1 - q.correct_percentage) * 100),
                              backgroundColor: 'rgba(255, 99, 132, 0.7)',
                              borderColor: 'rgba(255, 99, 132, 1)',
                              borderWidth: 1,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              title: {
                                display: true,
                                text: 'Percentage (%)'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Questions'
                              }
                            }
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: true,
                              text: 'Correct vs Wrong Answers per Question'
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Bảng chi tiết */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-green-700">Question Details</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-50 sticky top-0 z-10">
                            <TableHead className="font-semibold text-center">Question #</TableHead>
                            <TableHead className="font-semibold text-center">Correct %</TableHead>
                            <TableHead className="font-semibold text-center">Wrong %</TableHead>
                            <TableHead className="font-semibold text-center">Visualization</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.question_stats?.map((stat) => (
                            <TableRow key={stat.question_number} className="hover:bg-green-50">
                              <TableCell className="font-medium text-center">Question {stat.question_number}</TableCell>
                              <TableCell className="text-green-600 font-medium text-center">
                                {(stat.correct_percentage * 100).toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-red-600 font-medium text-center">
                                {(100 - stat.correct_percentage * 100).toFixed(1)}%
                              </TableCell>
                              <TableCell className="w-40">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className="bg-green-600 h-2.5 rounded-full" 
                                    style={{ width: `${stat.correct_percentage * 100}%` }}
                                  ></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-green-500" />
                <p className="text-gray-500">Loading statistics...</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button onClick={() => setIsStatsModalOpen(false)} className="bg-green-600 hover:bg-green-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hàm kiểm tra xem bài nộp có phải là mới trong 24h không
function isRecent(dateStr) {
  if (!dateStr) return false;
  const submissionDate = new Date(dateStr);
  const now = new Date();
  return (now - submissionDate) < 1000 * 60 * 60 * 24; // 24 giờ
}