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
import CreateTestLoading from "./loading";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useClassroom } from "@/hooks/useClassroom";
import { useTest } from "@/hooks/useTest";
import {
  FileText,
  BookOpen,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
  Printer,
  Shuffle,
  X,
  Info,
  CheckSquare,
  Copy,
} from "lucide-react";

export default function CreatePaperTest() {
  const router = useRouter();
  const { fetchSubjects, fetchChapters, fetchSections, fetchQuestions } =
    useQuestionBank();
  const { getAllClassrooms } = useClassroom();
  const {
    createTest,
    generateFullTestPDF,
    loading,
    error: hookError,
  } = useTest();

  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form data
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    classroom_id: null,
    num_choices: 4,
    allow_multiple_answers: false,
    num_variants: 1,
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

  // Selected questions
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Random selection
  const [randomCount, setRandomCount] = useState("");
  const [showRandomInput, setShowRandomInput] = useState(false);

  // PDF Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadChapters(selectedSubject);
      resetChapterAndBelow();
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      loadSections(selectedChapter);
      resetSectionAndBelow();
    }
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedSection) {
      loadQuestions(selectedSection);
    }
  }, [selectedSection]);

  const loadInitialData = async () => {
    try {
      setPageLoading(true);
      const [subjectsData, classroomsData] = await Promise.all([
        fetchSubjects(),
        getAllClassrooms(),
      ]);
      setSubjects(subjectsData);
      setClassrooms(classroomsData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load initial data");
    } finally {
      setPageLoading(false);
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
      // ✅ CHỈ LẤY MC (bao gồm cả 1 và nhiều đáp án)
      const mcQuestions = data.filter((q) => q.question_type === "MC");
      setQuestions(mcQuestions);
    } catch (err) {
      console.error("Error loading questions:", err);
    }
  };

  const resetChapterAndBelow = () => {
    setSelectedChapter(null);
    setSelectedSection(null);
    setChapters([]);
    setSections([]);
    setQuestions([]);
  };

  const resetSectionAndBelow = () => {
    setSelectedSection(null);
    setSections([]);
    setQuestions([]);
  };

  const handleToggleQuestion = (question) => {
    const isSelected = selectedQuestions.some((q) => q.id === question.id);
    if (isSelected) {
      setSelectedQuestions(
        selectedQuestions.filter((q) => q.id !== question.id),
      );
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleRandomSelect = () => {
    const count = parseInt(randomCount);
    if (!count || count < 1) {
      setError("Please enter a valid number");
      return;
    }
    if (count > questions.length) {
      setError(`Only ${questions.length} questions available`);
      return;
    }

    const currentSectionIds = new Set(questions.map((q) => q.id));
    const questionsFromOther = selectedQuestions.filter(
      (q) => !currentSectionIds.has(q.id),
    );

    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const randomQuestions = shuffled.slice(0, count);

    setSelectedQuestions([...questionsFromOther, ...randomQuestions]);
    setRandomCount("");
    setShowRandomInput(false);
    setError(null);
  };

  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };

  const handlePreview = async () => {
    if (selectedQuestions.length === 0) {
      setError("Please select at least one question");
      return;
    }

    try {
      const payload = {
        title: testData.title || "Preview Test",
        num_choices: parseInt(testData.num_choices),
        questions: selectedQuestions.map((q) => q.id),
      };

      const blob = await generateFullTestPDF(payload);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
      setError(null);
    } catch (err) {
      console.error("Error generating preview:", err);
      setError(err.message || "Failed to generate preview");
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!testData.title) {
      setError("Test title is required");
      return;
    }

    if (selectedQuestions.length === 0) {
      setError("Please select at least one question");
      return;
    }

    if (testData.num_variants < 1 || testData.num_variants > 10) {
      setError("Number of variants must be between 1 and 10");
      return;
    }

    try {
      const payload = {
        title: testData.title,
        description: testData.description,
        classroom: testData.classroom_id,
        num_questions: selectedQuestions.length,
        num_choices: parseInt(testData.num_choices),
        allow_multiple_answers: testData.allow_multiple_answers,
        num_variants: parseInt(testData.num_variants), 
        questions: selectedQuestions.map((q) => q.id),
      };

      await createTest(payload);
      alert("Paper test created successfully!");
      router.push("/quiz");
    } catch (err) {
      console.error("Error creating test:", err);
      setError(err.message || "Failed to create test");
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      MC: "bg-blue-100 text-blue-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (pageLoading && subjects.length === 0) return <CreateTestLoading />;

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Card */}
          <Card className="border-0 shadow-xl overflow-hidden mb-4 !p-0">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-0 m-0">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">
                      Create Paper Test (OMR)
                    </CardTitle>
                    <p className="text-green-100 mt-1">
                      Select MC questions and generate OMR sheets
                    </p>
                  </div>
                </div>
                <Button
                className="bg-white text-green-700 hover:bg-green-50"
                  onClick={() => {
                    window.dispatchEvent(new Event("navigation-start"));
                    router.push("/quiz");
                  }}
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Manage Tests
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Info Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Note:</strong> Paper tests support Multiple Choice questions. 
              You can create multiple test variants with different question orders and shuffled answer choices.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {(error || hookError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || hookError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column: Test Configuration */}
            <Card className="border-0 shadow-lg !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-green-200 to-emerald-400 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 p-2 rounded-t-lg">
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={testData.title}
                    onChange={(e) =>
                      setTestData({ ...testData, title: e.target.value })
                    }
                    placeholder="e.g., Mid-term Exam 2024"
                    className="mt-2"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={testData.description}
                    onChange={(e) =>
                      setTestData({ ...testData, description: e.target.value })
                    }
                    placeholder="Brief description"
                    className="mt-2"
                  />
                </div>

                {/* Classroom */}
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
                    <SelectTrigger className="mt-2">
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

                {/* Number of Choices */}
                <div>
                  <Label htmlFor="num_choices">Number of Choices</Label>
                  <Input
                    id="num_choices"
                    type="number"
                    min="2"
                    max="6"
                    value={testData.num_choices}
                    onChange={(e) =>
                      setTestData({
                        ...testData,
                        num_choices: parseInt(e.target.value) || 4,
                      })
                    }
                    className="mt-2"
                  />
                </div>

                {/* NUMBER OF VARIANTS */}
                <div>
                  <Label htmlFor="num_variants" className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-purple-600" />
                    Number of Test Variants
                  </Label>
                  <Input
                    id="num_variants"
                    type="number"
                    min="1"
                    max="10"
                    value={testData.num_variants}
                    onChange={(e) =>
                      setTestData({
                        ...testData,
                        num_variants: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    System will create {testData.num_variants} {testData.num_variants === 1 ? 'version' : 'versions'} 
                    {testData.num_variants > 1 && ' (A, B, C...)'} with shuffled questions and answers
                  </p>
                </div>

                {/* Summary */}
                <div className="border-t pt-5 mt-5">
                  <h4 className="font-semibold mb-3">Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selected Questions:</span>
                      <span className="font-semibold text-green-600">
                        {selectedQuestions.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Choices per Question:
                      </span>
                      <span className="font-semibold">
                        {testData.num_choices}
                      </span>
                    </div>
                    {/* ✅ MULTIPLE ANSWERS DISPLAY */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Multiple Answer Qs:</span>
                      <span className="font-semibold text-purple-600">
                        {
                          selectedQuestions.filter(
                            (q) => q.has_multiple_correct_answers,
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Variants:</span>
                      <span className="font-semibold text-indigo-600">
                        {testData.num_variants} {testData.num_variants === 1 ? 'variant' : 'variants'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-3">
                  <Button
                    onClick={handlePreview}
                    disabled={loading || selectedQuestions.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 mb-2"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Preview Test"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || selectedQuestions.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? "Creating..." : `Create Test${testData.num_variants > 1 ? ` (${testData.num_variants} Variants)` : ''}`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Middle + Right Column: Question Bank Browser */}
            <Card className="border-0 shadow-lg lg:col-span-2 !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-green-200 to-emerald-400 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 p-2">
                  Select Multiple Choice Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Subject */}
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

                  {/* Chapter */}
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

                  {/* Section */}
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

                {/* Random Selection */}
                {selectedSection && questions.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRandomInput(!showRandomInput)}
                        className="flex items-center gap-2"
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
                            className="w-32"
                          />
                          <Button
                            type="button"
                            onClick={handleRandomSelect}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Add Random
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
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

                {/* Available Questions List */}
                {!selectedSection ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>Select a section to view Multiple Choice questions</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>
                      No Multiple Choice questions available in this section
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {questions.map((question) => {
                      const isSelected = selectedQuestions.some(
                        (q) => q.id === question.id,
                      );
                      const hasMultipleAnswers =
                        question.has_multiple_correct_answers;

                      return (
                        <div
                          key={question.id}
                          className={`border rounded-lg p-4 transition-all cursor-pointer ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
                          }`}
                          onClick={() => handleToggleQuestion(question)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox checked={isSelected} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {question.prompt}
                                  </p>
                                  {/* ✅ MULTIPLE ANSWERS NOTE */}
                                  {hasMultipleAnswers && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
                                      <CheckSquare className="h-3 w-3" />
                                      <span className="font-semibold">
                                        Multiple Correct Answers
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <Badge
                                  className={getTypeColor(
                                    question.question_type,
                                  )}
                                >
                                  {question.question_type_display}
                                </Badge>
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Selected Questions ({selectedQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {selectedQuestions.map((question, index) => {
                    const hasMultipleAnswers =
                      question.has_multiple_correct_answers;

                    return (
                      <div
                        key={question.id}
                        className="flex items-start gap-4 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-center min-w-[2.5rem] h-10 rounded-full bg-green-100 text-green-700 font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="font-medium">{question.prompt}</p>
                              {/* ✅ NOTE */}
                              {hasMultipleAnswers && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
                                  <CheckSquare className="h-3 w-3" />
                                  <span className="font-semibold">
                                    Multiple Correct Answers
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge
                              className={getTypeColor(question.question_type)}
                            >
                              {question.question_type_display}
                            </Badge>
                          </div>
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
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Preview Modal */}
          {showPreview && previewUrl && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-xl font-semibold">Full Test Preview</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(previewUrl, "_blank")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        window.URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </div>
                </div>
                <iframe
                  src={previewUrl}
                  className="flex-1 w-full"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
