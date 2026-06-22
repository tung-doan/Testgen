"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import CreateOnlineTestLoading from "./loading";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useClassroom } from "@/hooks/useClassroom";
import Notification from "@/components/common/Notification";
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
import extractErrorMessage from "@/lib/extractErrorMessage";

export default function CreateOnlineTest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const { fetchSubjects, fetchChapters, fetchSections, fetchQuestions } =
    useQuestionBank();
  const { getAllClassrooms } = useClassroom();

  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

 // Form data
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    classroom_id: null,
    duration_minutes: 45,
    max_attempts: 1,
    show_results_immediately: true,
 // publish_now: boolean - default true (checked)
    publish_now: true,
    publish_at: "",
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

 // Question filters
  const [questionSearchTerm, setQuestionSearchTerm] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("all");

 // Random questions feature
  const [randomCount, setRandomCount] = useState("");
  const [showRandomInput, setShowRandomInput] = useState(false);

  const toLocalDateTimeInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (editId && subjects.length > 0 && classrooms.length > 0) {
      loadExamForEdit(editId);
    }
  }, [editId, subjects.length, classrooms.length]);

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
      loadQuestions(selectedSection, questionTypeFilter);
    }
  }, [selectedSection, questionTypeFilter]);

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
      const msg = extractErrorMessage(err, "Failed to load initial data");
      console.debug("Error loading initial data:", err);
      showNotification(msg, "error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (subjectId) => {
    try {
      const data = await fetchChapters(subjectId);
      setChapters(data);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load chapters");
      console.debug("Error loading chapters:", err);
      showNotification(msg, "error");
    }
  };

  const loadSections = async (chapterId) => {
    try {
      const data = await fetchSections(chapterId);
      setSections(data);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load sections");
      console.debug("Error loading sections:", err);
      showNotification(msg, "error");
    }
  };

  const loadQuestions = async (sectionId, typeFilter = "all") => {
    try {
      const filters = { section_id: sectionId };
      if (typeFilter !== "all") {
        filters.question_type = typeFilter;
      }
      const data = await fetchQuestions(filters);
      setQuestions(data);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load questions");
      console.debug("Error loading questions:", err);
      showNotification(msg, "error");
    }
  };

  const loadExamForEdit = async (examId) => {
    try {
      setLoading(true);
      const [examData, examQuestionsData] = await Promise.all([
        OnlineExamService.getExamDetail(examId),
        OnlineExamService.getExamQuestions(examId),
      ]);

 // Check if exam is already published
      if (examData.is_published) {
        showNotification(
          "This exam has been published and cannot be updated",
          "error",
        );
        setError("This exam has been published and cannot be updated");
        router.push("/online-tests");
        return;
      }

      setTestData({
        title: examData.title || "",
        description: examData.description || "",
        classroom_id: examData.classroom || null,
        duration_minutes: examData.duration_minutes ?? 45,
        max_attempts: examData.max_attempts ?? 1,
        show_results_immediately: Boolean(examData.show_results_immediately),
        publish_now: Boolean(examData.is_published),
        publish_at: toLocalDateTimeInput(examData.publish_at),
      });

      const mappedQuestions = examQuestionsData.map((item) => item.question);
      setSelectedQuestions(mappedQuestions);

      const mappedPoints = {};
      examQuestionsData.forEach((item) => {
        mappedPoints[item.question.id] = item.points ?? 1.0;
      });
      setQuestionPoints(mappedPoints);

      const firstQuestion = examQuestionsData[0]?.question;
      if (firstQuestion?.section) {
        setSelectedSection(firstQuestion.section);
      }
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load exam for update");
      console.debug("Error loading exam for edit:", err);
      showNotification(msg, "error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQuestion = (question) => {
    setSelectedQuestions((currentSelectedQuestions) => {
      const isSelected = currentSelectedQuestions.some(
        (q) => String(q.id) === String(question.id),
      );

      if (isSelected) {
        return currentSelectedQuestions.filter(
          (q) => String(q.id) !== String(question.id),
        );
      }

      return [...currentSelectedQuestions, question];
    });
  };

  const handleRandomSelect = () => {
    const count = parseInt(randomCount);

 // Validation
    if (!count || count < 1) {
      showNotification("Please enter a valid number", "error");
      return;
    }

 // Calculate available questions (not already selected) from current section
    const currentSelectedIds = new Set(
      selectedQuestions.map((q) => String(q.id)),
    );

    const availableQuestions = questions.filter(
      (q) => !currentSelectedIds.has(String(q.id)),
    );

 // If all questions in section are already selected
    if (availableQuestions.length === 0) {
      showNotification(
        "All questions in this section are already selected",
        "info",
      );
      setRandomCount("");
      setShowRandomInput(false);
      return;
    }

 // Calculate actual count to add (min of requested or available)
    const actualCount = Math.min(count, availableQuestions.length);

 // Shuffle and select from available questions
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const randomQuestions = shuffled.slice(0, actualCount);

 // Update state by merging new questions with existing
    setSelectedQuestions((currentSelectedQuestions) => [
      ...currentSelectedQuestions,
      ...randomQuestions,
    ]);

    setQuestionPoints((currentPoints) => {
      const nextPoints = { ...currentPoints };

      randomQuestions.forEach((question) => {
        if (nextPoints[question.id] === undefined) {
          nextPoints[question.id] = 1.0;
        }
      });

      return nextPoints;
    });

 // Show smart notification
    if (count > availableQuestions.length) {
      showNotification(
        `Only ${availableQuestions.length} question(s) available in this section. Added all ${actualCount} question(s).`,
        "warning",
      );
    } else {
      showNotification(`Added ${actualCount} question(s)`, "success");
    }

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
    setSelectedQuestions((currentSelectedQuestions) =>
      currentSelectedQuestions.filter(
        (q) => String(q.id) !== String(questionId),
      ),
    );
    setQuestionPoints((currentPoints) => {
      const nextPoints = { ...currentPoints };
      delete nextPoints[questionId];
      return nextPoints;
    });
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.prompt
      .toLowerCase()
      .includes(questionSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const isQuestionSelected = (questionId) =>
    selectedQuestions.some((q) => String(q.id) === String(questionId));

  const calculateTotalPoints = () => {
    const uniqueIds = new Set();

    return selectedQuestions.reduce((sum, q) => {
      if (uniqueIds.has(q.id)) return sum;
      uniqueIds.add(q.id);

      const rawPoint = questionPoints[q.id];

      const finalPoint =
        rawPoint === "" || rawPoint === undefined
          ? q.points || 0
          : parseFloat(rawPoint);

      return sum + finalPoint;
    }, 0);
  };

  useEffect(() => {
    if (selectedQuestions.length > 0) {
      const defaultPoints = { ...questionPoints };
      selectedQuestions.forEach((q) => {
        if (defaultPoints[q.id] === undefined) {
          defaultPoints[q.id] = 1.0;
        }
      });
      setQuestionPoints(defaultPoints);
    }
  }, [selectedQuestions.length]);

  const calculateScaledTotal = () => {
    const rawTotal = calculateTotalPoints();
    if (rawTotal === 0) return 0;
    return 10.0;
  };

  const handleSubmit = async () => {
    setError(null);

 // Validation
    if (!testData.title) {
      showNotification("Test title is required", "error");
      return;
    }

    if (!testData.classroom_id) {
      showNotification("Please select a class", "error");
      return;
    }

    if (selectedQuestions.length === 0) {
      showNotification("Please select at least one question", "error");
      return;
    }

    if (testData.duration_minutes === "" || testData.duration_minutes < 1) {
      showNotification("Duration must be at least 1 minute", "error");
      return;
    }

    if (testData.duration_minutes > 240) {
      showNotification("Duration cannot exceed 240 minutes", "error");
      return;
    }

    if (testData.max_attempts === "" || testData.max_attempts < 1) {
      showNotification(
        "Max attempts is required and must be at least 1",
        "error",
      );
      return;
    }

    if (testData.max_attempts > 999) {
      showNotification("Max attempts cannot exceed 999", "error");
      return;
    }

    try {
      setIsCreating(true);

 // Prepare payload
      const payload = {
        title: testData.title,
        classroom: testData.classroom_id,
        duration_minutes: parseInt(testData.duration_minutes),
        max_attempts: parseInt(testData.max_attempts),
        show_results_immediately: testData.show_results_immediately,
        questions: selectedQuestions.map((q) => q.id),
      };

 // Handle publish: publish_now checkbox controls behavior
      if (testData.publish_now) {
        payload.is_published = true;
        payload.publish_at = null;
      } else {
 // scheduled publish - require a valid future datetime
        if (!testData.publish_at) {
          showNotification("Please select a publish date and time", "error");
          setIsCreating(false);
          return;
        }

        const scheduledDate = new Date(testData.publish_at);
        if (isNaN(scheduledDate.getTime())) {
          showNotification("Invalid publish date/time", "error");
          setIsCreating(false);
          return;
        }

        const now = new Date();
        if (scheduledDate <= now) {
          showNotification("Publish date/time must be in the future", "error");
          setIsCreating(false);
          return;
        }

        payload.is_published = false;
        payload.publish_at = scheduledDate.toISOString();
      }

      const isEditing = Boolean(editId);

 // Create or update exam
      const exam = isEditing
        ? await OnlineExamService.updateExam(editId, payload)
        : await OnlineExamService.createExam(payload);

 // Update question points if different from default
      const questionsWithPoints = selectedQuestions.map((q, index) => ({
        question_id: q.id,
        order: index + 1,
        points: questionPoints[q.id] || 1.0,
      }));

      await OnlineExamService.updateExamQuestions(exam.id, questionsWithPoints);

      showNotification(
        isEditing
          ? "Online test updated successfully!"
          : "Online test created successfully!",
        "success",
      );
      window.dispatchEvent(new Event("navigation-start"));
      router.push("/online-tests");
    } catch (err) {
      console.debug("Error creating test:", err);
      const errorMessage = extractErrorMessage(
        err,
        editId ? "Failed to update test" : "Failed to create test",
      );
      showNotification(errorMessage, "error");
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsCreating(false);
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
    return <CreateOnlineTestLoading />;
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
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Monitor className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">
                      {editId ? "Update Online Test" : "Create Online Test"}
                    </CardTitle>
                    <p className="text-blue-100 mt-1">
                      Build interactive online exams with questions from your
                      bank
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    window.dispatchEvent(new Event("navigation-start"));
                    router.push("/online-tests");
                  }}
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
                  <Label htmlFor="classroom">Class *</Label>
                  <Select
                    value={testData.classroom_id?.toString() || ""}
                    onValueChange={(value) =>
                      setTestData({
                        ...testData,
                        classroom_id: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="mt-2 mb-2">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
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
                    max="240"
                    value={testData.duration_minutes}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setTestData({ ...testData, duration_minutes: "" });
                        return;
                      }
                      let num = parseInt(raw, 10);
                      if (isNaN(num)) {
                        setTestData({ ...testData, duration_minutes: "" });
                        return;
                      }
                      if (num < 1) num = 1;
                      if (num > 240) num = 240;
                      setTestData({ ...testData, duration_minutes: num });
                    }}
                    className="mt-2 mb-2"
                  />
                </div>

                <div>
                  <Label htmlFor="attempts">Max Attempts</Label>
                  <Input
                    id="attempts"
                    type="number"
                    min="1"
                    max="999"
                    value={testData.max_attempts}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setTestData({ ...testData, max_attempts: "" });
                        return;
                      }
 // strip leading zeros
                      const cleaned = raw.replace(/^0+/, "");
                      let num = parseInt(cleaned, 10);
                      if (isNaN(num)) {
                        setTestData({ ...testData, max_attempts: "" });
                        return;
                      }
                      if (num < 1) num = 1;
                      if (num > 999) num = 999;
                      setTestData({ ...testData, max_attempts: num });
                    }}
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

                {/* Publish checkbox: checked = publish now, unchecked = require schedule */}
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="publishNow"
                      checked={testData.publish_now}
                      onCheckedChange={(checked) =>
                        setTestData({ ...testData, publish_now: checked })
                      }
                    />
                    <Label
                      htmlFor="publishNow"
                      className="text-sm cursor-pointer"
                    >
                      Publish now
                    </Label>
                  </div>

                  {!testData.publish_now && (
                    <div className="mt-3">
                      <Label className="text-sm">
                        Select publish date & time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={testData.publish_at}
                        onChange={(e) =>
                          setTestData({
                            ...testData,
                            publish_at: e.target.value,
                          })
                        }
                        className="w-auto mt-2"
                      />
                    </div>
                  )}
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
                  disabled={isCreating || selectedQuestions.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 mt-4 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {editId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {editId ? "Update Online Test" : "Create Online Test"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right: Question Bank Browser */}
            <Card className="border-0 shadow-lg lg:col-span-2 !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 p-3">
                  Select Questions from Bank
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

                  <div>
                    <Label>Question Type</Label>
                    <Select
                      value={questionTypeFilter}
                      onValueChange={(value) => setQuestionTypeFilter(value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="MC">Multiple Choice</SelectItem>
                        <SelectItem value="TFE">True/False</SelectItem>
                        <SelectItem value="ORD">Ordering</SelectItem>
                        <SelectItem value="FIB">Fill in the Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Search questions</Label>
                  <Input
                    value={questionSearchTerm}
                    onChange={(e) => setQuestionSearchTerm(e.target.value)}
                    placeholder="Search by question text..."
                    className="mt-2"
                  />
                </div>

                {/*  Random Selection Feature */}
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
                            className="mb-4 cursor-pointer bg-gray-100 hover:bg-gray-200"
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
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No questions match the current filters</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredQuestions.map((question) => {
                      const isSelected = isQuestionSelected(question.id);
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
                                    question.question_type,
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
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </>
  );
}
