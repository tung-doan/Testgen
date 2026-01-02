"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/app/loading";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useClassroom } from "@/hooks/useClassroom";
import {
  Monitor,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Shuffle,
} from "lucide-react";
import OnlineExamService from "@/services/onlineExam.service";

export default function CreateOnlineTest() {
  const router = useRouter();
  const { fetchSubjects, fetchChapters, fetchSections, fetchQuestions } =
    useQuestionBank();
  const { getAllClassrooms } = useClassroom();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form data
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    classroom_id: null,
    duration_minutes: 45,
    max_attempts: 1,
    show_results_immediately: true,
  });

  // Question Bank data
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // Selected filters
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Selected questions for exam
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionPoints, setQuestionPoints] = useState({});

  // Random questions feature
  const [randomCount, setRandomCount] = useState("");
  const [showRandomInput, setShowRandomInput] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadChapters(selectedSubject);
      setSelectedChapter(null);
      setSelectedSection(null);
      setChapters([]);
      setSections([]);
      setQuestions([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      loadSections(selectedChapter);
      setSelectedSection(null);
      setSections([]);
      setQuestions([]);
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedSection) {
      loadQuestions(selectedSection);
    }
  }, [selectedSection]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [subjectsData, classroomsData] = await Promise.all([
        fetchSubjects(),
        getAllClassrooms(),
      ]);
      setSubjects(subjectsData);
      setClassrooms(classroomsData);
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (subjectId) => {
    try {
      const data = await fetchChapters(subjectId);
      setChapters(data);
    } catch (err) {
      console.error("Error loading chapters:", err);
    }
  };

  const loadSections = async (chapterId) => {
    try {
      const data = await fetchSections(chapterId);
      setSections(data);
    } catch (err) {
      console.error("Error loading sections:", err);
    }
  };

  const loadQuestions = async (sectionId) => {
    try {
      const data = await fetchQuestions({ section_id: sectionId });
      setQuestions(data);
    } catch (err) {
      console.error("Error loading questions:", err);
    }
  };

  const handleToggleQuestion = (question) => {
    const isSelected = selectedQuestions.some((q) => q.id === question.id);

    if (isSelected) {
      setSelectedQuestions(
        selectedQuestions.filter((q) => q.id !== question.id)
      );
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleRandomSelect = () => {
    const count = parseInt(randomCount);

    // Validation
    if (!count || count < 1) {
      setError("Please enter a valid number");
      return;
    }

    if (count > questions.length) {
      setError(`Only ${questions.length} questions available in this section`);
      return;
    }

    // Tạo danh sách ngẫu nhiên mới từ danh sách hiện tại (questions)
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const randomQuestions = shuffled.slice(0, count);

    // Lấy danh sách ID của các câu hỏi trong Section hiện tại đang hiển thị
    const currentSectionQuestionIds = new Set(questions.map((q) => q.id));

    // Giữ lại các câu hỏi đã chọn TRƯỚC ĐÓ mà KHÔNG thuộc Section này
    // (Ví dụ: bạn đã chọn câu hỏi ở Chương 1, giờ đang chọn random ở Chương 2 thì không được xóa của Chương 1)
    const questionsFromOtherSections = selectedQuestions.filter(
      (q) => !currentSectionQuestionIds.has(q.id)
    );

    //Gộp câu hỏi cũ (của section khác) + câu hỏi random mới (của section này)
    const newSelected = [...questionsFromOtherSections, ...randomQuestions];

    //Cập nhật lại điểm số (Points)
    const newPoints = { ...questionPoints };

    questions.forEach((q) => {
      if (!randomQuestions.find((rq) => rq.id === q.id)) {
        delete newPoints[q.id];
      }
    });

    // Thêm điểm mặc định cho các câu hỏi random mới
    randomQuestions.forEach((question) => {
      newPoints[question.id] = question.points || 1.0;
    });

    setSelectedQuestions(newSelected);
    setQuestionPoints(newPoints);

    // Reset UI
    setRandomCount("");
    setShowRandomInput(false);
    setError(null);
  };

  const handlePointsChange = (questionId, value) => {
    if (value === "") {
      setQuestionPoints({
        ...questionPoints,
        [questionId]: "",
      });
      return;
    }

    const points = parseFloat(value);
    if (!isNaN(points) && points >= 0) {
      setQuestionPoints({
        ...questionPoints,
        [questionId]: points,
      });
    }
  };

  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
    const newPoints = { ...questionPoints };
    delete newPoints[questionId];
    setQuestionPoints(newPoints);
  };

  const calculateTotalPoints = () => {
    // Dùng Set để lọc trùng ID câu hỏi
    const uniqueIds = new Set();

    return selectedQuestions.reduce((sum, q) => {
      // Nếu ID này đã cộng rồi thì bỏ qua (fix lỗi tăng gấp đôi)
      if (uniqueIds.has(q.id)) return sum;
      uniqueIds.add(q.id);

      // Lấy điểm từ state questionPoints
      const rawPoint = questionPoints[q.id];

      // Nếu đang là chuỗi rỗng "" hoặc chưa có, lấy điểm mặc định
      // Nếu là số thì lấy số
      const finalPoint =
        rawPoint === "" || rawPoint === undefined
          ? q.points || 0
          : parseFloat(rawPoint);

      return sum + finalPoint;
    }, 0);
  };

  useEffect(() => {
    if (selectedQuestions.length > 0) {
      const defaultPoints = {};
      selectedQuestions.forEach((q) => {
        defaultPoints[q.id] = 1.0; // Mặc định mỗi câu 1 điểm
      });
      setQuestionPoints(defaultPoints);
    }
  }, [selectedQuestions.length]);

  const calculateScaledTotal = () => {
    const rawTotal = calculateTotalPoints();
    if (rawTotal === 0) return 0;
    // Giả sử tất cả câu đúng -> Hiển thị thang 10
    return 10.0;
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!testData.title) {
      setError("Test title is required");
      return;
    }

    if (selectedQuestions.length === 0) {
      setError("Please select at least one question");
      return;
    }

    if (testData.duration_minutes < 1) {
      setError("Duration must be at least 1 minute");
      return;
    }

    try {
      setLoading(true);

      // Prepare payload
      const payload = {
        title: testData.title,
        classroom: testData.classroom_id,
        duration_minutes: parseInt(testData.duration_minutes),
        max_attempts: parseInt(testData.max_attempts),
        show_results_immediately: testData.show_results_immediately,
        questions: selectedQuestions.map((q) => q.id),
      };

      // Create exam
      const exam = await OnlineExamService.createExam(payload);

      // Update question points if different from default
      const questionsWithPoints = selectedQuestions.map((q, index) => ({
        question_id: q.id,
        order: index + 1,
        points: questionPoints[q.id] || 1.0,
      }));

      await OnlineExamService.updateExamQuestions(exam.id, questionsWithPoints);

      alert("Online test created successfully!");
      router.push("/online-tests");
    } catch (err) {
      console.error("Error creating test:", err);
      let errorMessage = "Failed to create test";

      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.questions && Array.isArray(data.questions)) {
          errorMessage = data.questions[0];
        } else if (data.error) {
          errorMessage = data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (loading && !subjects.length) {
    return <LoadingScreen message="Loading..." />;
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
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Monitor className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">
                      Create Online Test
                    </CardTitle>
                    <p className="text-blue-100 mt-1">
                      Build interactive online exams with questions from your
                      bank
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/online-tests")}
                  className="bg-white text-blue-700 hover:cursor-pointer hover:bg-blue-50 flex items-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  Manage Tests
                </Button>
              </div>
            </CardHeader>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left: Test Configuration */}
            <Card className="border-0 shadow-lg lg:col-span-1 !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="flex items-center  gap-2 p-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={testData.title}
                    onChange={(e) =>
                      setTestData({ ...testData, title: e.target.value })
                    }
                    placeholder="e.g., Mid-term Exam 2024"
                    className="mt-2 mb-2"
                  />
                </div>

                <div>
                  <Label htmlFor="classroom">Class (Optional)</Label>
                  <Select
                    value={testData.classroom_id?.toString() || "none"}
                    onValueChange={(value) =>
                      setTestData({
                        ...testData,
                        classroom_id: value === "none" ? null : parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="mt-2 mb-2">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No class</SelectItem>
                      {classrooms.map((classroom) => (
                        <SelectItem
                          key={classroom.id}
                          value={classroom.id.toString()}
                        >
                          {classroom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={testData.duration_minutes}
                    onChange={(e) =>
                      setTestData({
                        ...testData,
                        duration_minutes: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-2 mb-2"
                  />
                </div>

                <div>
                  <Label htmlFor="attempts">Max Attempts</Label>
                  <Input
                    id="attempts"
                    type="number"
                    min="1"
                    value={testData.max_attempts}
                    onChange={(e) =>
                      setTestData({
                        ...testData,
                        max_attempts:
                          e.target.value === ""
                            ? ""
                            : e.target.value.replace(/^0+/, ""),
                      })
                    }
                    className="mt-2 mb-2"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2 gap-2">
                  <Checkbox
                    id="showResults"
                    checked={testData.show_results_immediately}
                    onCheckedChange={(checked) =>
                      setTestData({
                        ...testData,
                        show_results_immediately: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="showResults"
                    className="text-sm cursor-pointer"
                  >
                    Show results immediately after submission
                  </Label>
                </div>

                {/* Summary */}
                <div className="border-t pt-5 mt-5">
                  <h4 className="font-semibold mb-3">Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-semibold">
                        {selectedQuestions.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Raw Total:</span>
                      <span className="font-semibold text-blue-600">
                        {calculateTotalPoints().toFixed(1)} points
                      </span>
                    </div>

                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-xs text-blue-800">
                      ℹ️ Final score will be scaled to 10-point scale
                      automatically
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold">
                        {testData.duration_minutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || selectedQuestions.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Online Test
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right: Question Bank Browser */}
            <Card className="border-0 shadow-lg lg:col-span-2 !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 p-3">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Select Questions from Bank
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Subject</Label>
                    <Select
                      value={selectedSubject?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedSubject(parseInt(value))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem
                            key={subject.id}
                            value={subject.id.toString()}
                          >
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Chapter</Label>
                    <Select
                      value={selectedChapter?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedChapter(parseInt(value))
                      }
                      disabled={!selectedSubject}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((chapter) => (
                          <SelectItem
                            key={chapter.id}
                            value={chapter.id.toString()}
                          >
                            {chapter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Section</Label>
                    <Select
                      value={selectedSection?.toString() || ""}
                      onValueChange={(value) =>
                        setSelectedSection(parseInt(value))
                      }
                      disabled={!selectedChapter}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem
                            key={section.id}
                            value={section.id.toString()}
                          >
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ✅ Random Selection Feature */}
                {selectedSection && questions.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRandomInput(!showRandomInput)}
                        className="flex items-center gap-2 mb-4"
                      >
                        <Shuffle className="h-4 w-4" />
                        Random Select
                      </Button>

                      {showRandomInput && (
                        <>
                          <Input
                            type="number"
                            min="1"
                            max={questions.length}
                            value={randomCount}
                            onChange={(e) => setRandomCount(e.target.value)}
                            placeholder={`Max: ${questions.length}`}
                            className="w-32 mb-4"
                          />
                          <Button
                            type="button"
                            onClick={handleRandomSelect}
                            className="bg-purple-600 hover:bg-purple-700 mb-4 cursor-pointer"
                          >
                            Add Random
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="mb-4 cursor-pointer bg-gray-100 hover:bg-gray-400"
                            onClick={() => {
                              setShowRandomInput(false);
                              setRandomCount("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Available Questions */}
                {!selectedSection ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>Select a section to view questions</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No questions available in this section</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {questions.map((question) => {
                      const isSelected = selectedQuestions.some(
                        (q) => q.id === question.id
                      );
                      return (
                        <div
                          key={question.id}
                          className={`border rounded-lg p-4 transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                handleToggleQuestion(question)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-medium text-gray-900">
                                  {question.prompt}
                                </p>
                                <Badge
                                  className={getTypeColor(
                                    question.question_type
                                  )}
                                >
                                  {question.question_type_display}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {isSelected && (
                                  <span>
                                    Points: {questionPoints[question.id]}
                                  </span>
                                )}
                                {question.question_type !== "FIB" && (
                                  <span>
                                    Options: {question.option_count || 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Questions Preview */}
          {selectedQuestions.length > 0 && (
            <Card className="border-0 shadow-lg !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Selected Questions ({selectedQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-start gap-4 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-center min-w-[2rem] h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="font-medium">{question.prompt}</p>
                          <Badge
                            className={getTypeColor(question.question_type)}
                          >
                            {question.question_type_display}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`points-${question.id}`}
                              className="text-sm"
                            >
                              Points:
                            </Label>
                            <Input
                              id={`points-${question.id}`}
                              type="number"
                              min="0"
                              step="0.25"
                              value={
                                questionPoints[question.id] !== undefined
                                  ? questionPoints[question.id]
                                  : ""
                              }
                              onChange={(e) =>
                                handlePointsChange(question.id, e.target.value)
                              }
                              className="w-20"
                              onBlur={() => {
                                if (questionPoints[question.id] === "") {
                                  handlePointsChange(question.id, "0");
                                }
                              }}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
