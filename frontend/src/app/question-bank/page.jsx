"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import QuestionBankLoading from "./loading";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Eye,
  FolderOpen,
  FileText,
  Database,
  AlertCircle,
  ChevronRight,
  Pencil,
  ChevronLeft,
  HelpCircle,
  X,
  ImageIcon,
} from "lucide-react";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import Notification from "@/components/common/Notification";

export default function QuestionBank() {
  const router = useRouter();
  const {
    loading,
    error,
    fetchSubjects,
    createSubject,
    deleteSubject,
    updateSubject,
    fetchChapters,
    createChapter,
    deleteChapter,
    updateChapter,
    fetchSections,
    createSection,
    deleteSection,
    updateSection,
    uploadQuestions,
  } = useQuestionBank();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [sections, setSections] = useState([]);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedSectionForUpload, setSelectedSectionForUpload] =
    useState(null);

 // Pagination states
  const [subjectPage, setSubjectPage] = useState(1);
  const [chapterPage, setChapterPage] = useState(1);
  const [sectionPage, setSectionPage] = useState(1);
  const itemsPerPage = 10;

 // Edit states
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

 // Form data - Đã loại bỏ code
  const [subjectData, setSubjectData] = useState({ name: "" });
  const [chapterData, setChapterData] = useState({ name: "", order: "" });
  const [sectionData, setSectionData] = useState({ name: "", order: "" });
  const [uploadFile, setUploadFile] = useState(null);

  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadChapters(selectedSubject.id);
      setSelectedChapter(null);
      setSections([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      loadSections(selectedChapter.id);
    } else {
      setSections([]);
    }
  }, [selectedChapter]);

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    const total = Math.ceil(subjects.length / itemsPerPage);
    if (total > 0 && subjectPage > total) setSubjectPage(total);
  }, [subjects.length, subjectPage]);

  useEffect(() => {
    const total = Math.ceil(chapters.length / itemsPerPage);
    if (total > 0 && chapterPage > total) setChapterPage(total);
  }, [chapters.length, chapterPage]);

  useEffect(() => {
    const total = Math.ceil(sections.length / itemsPerPage);
    if (total > 0 && sectionPage > total) setSectionPage(total);
  }, [sections.length, sectionPage]);

  const handleDeleteChapter = async (chapterId) => {
    try {
      await deleteChapter(chapterId);

 // Reset state if deleted chapter was selected
      if (selectedChapter?.id === chapterId) {
        setSelectedChapter(null);
        setSections([]);
      }

 // Reload chapters
      if (selectedSubject) {
        await loadChapters(selectedSubject.id);
      }

      showNotification("Chapter deleted successfully!");
    } catch (err) {
      showNotification(err.message, "error");
      throw err;
    }
  };

  const handleDeleteSection = async (sectionId) => {
    try {
      await deleteSection(sectionId);

 // Reload sections
      if (selectedChapter) {
        await loadSections(selectedChapter.id);
      }

      showNotification("Section deleted successfully!");
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await fetchSubjects();
      setSubjects(data);
      if (data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0]);
      }
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const loadChapters = async (subjectId) => {
    try {
      const data = await fetchChapters(subjectId);
      setChapters(data);
      if (data.length > 0) {
        setSelectedChapter(data[0]);
      } else {
        setSelectedChapter(null);
        setSections([]);
      }
    } catch (err) {
      showNotification(err.message, "error");
      setChapters([]);
    }
  };

  const loadSections = async (chapterId) => {
    try {
      const data = await fetchSections(chapterId);
      setSections(data);
    } catch (err) {
      showNotification(err.message, "error");
      setSections([]);
    }
  };

  const handleCreateSubject = async () => {
    setFormError(null);

    if (!subjectData.name) {
      setFormError("Name is required");
      return;
    }

    try {
      await createSubject(subjectData);
      showNotification("Subject created successfully!");
      setIsSubjectModalOpen(false);
      setSubjectData({ name: "" }); //  Reset
      await loadSubjects();
    } catch (err) {
      setFormError(err.message);
      showNotification(err.message, "error");
    }
  };

  const handleCreateChapter = async () => {
    setFormError(null);

    if (!selectedSubject) {
      setFormError("Please select a subject first");
      return;
    }

    if (!chapterData.name) {
      setFormError("Chapter name is required");
      return;
    }

    try {
      await createChapter({
        ...chapterData,
        order: parseInt(chapterData.order) || (chapters.length > 0 ? Math.max(...chapters.map(c => c.order)) + 1 : 1),
        subject: selectedSubject.id,
      });
      showNotification("Chapter created successfully!");
      setIsChapterModalOpen(false);
      setChapterData({ name: "", order: "" });
      await loadChapters(selectedSubject.id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleCreateSection = async () => {
    setFormError(null);

    if (!selectedChapter) {
      setFormError("Please select a chapter first");
      return;
    }

    if (!sectionData.name) {
      setFormError("Section name is required");
      return;
    }

    try {
      await createSection({
        ...sectionData,
        order: parseInt(sectionData.order) || (sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1),
        chapter: selectedChapter.id,
      });
      showNotification("Section created successfully!");
      setIsSectionModalOpen(false);
      setSectionData({ name: "", order: "" });
      await loadSections(selectedChapter.id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdateSection = async () => {
    setFormError(null);
    if (!editingSection) return;
    if (!sectionData.name) {
      setFormError("Section name is required");
      return;
    }

    try {
      await updateSection(editingSection.id, {
        ...sectionData,
        order: parseInt(sectionData.order) || 1,
        chapter: selectedChapter.id,
      });
      showNotification("Section updated successfully!");
      setIsSectionModalOpen(false);
      setEditingSection(null);
      setSectionData({ name: "", order: "" });
      await loadSections(selectedChapter.id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdateChapter = async () => {
    setFormError(null);
    if (!editingChapter) return;
    if (!chapterData.name) {
      setFormError("Chapter name is required");
      return;
    }

    try {
      await updateChapter(editingChapter.id, {
        ...chapterData,
        order: parseInt(chapterData.order) || 1,
        subject: selectedSubject.id,
      });
      showNotification("Chapter updated successfully!");
      setIsChapterModalOpen(false);
      setEditingChapter(null);
      setChapterData({ name: "", order: "" });
      await loadChapters(selectedSubject.id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdateSubject = async () => {
    setFormError(null);
    if (!editingSubject) return;
    if (!subjectData.name) {
      setFormError("Subject name is required");
      return;
    }

    try {
      await updateSubject(editingSubject.id, subjectData);
      showNotification("Subject updated successfully!");
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectData({ name: "" });
      await loadSubjects();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUploadQuestions = async () => {
    setFormError(null);

    if (!uploadFile || !selectedSectionForUpload) {
      setFormError("Please select a file and section");
      return;
    }

 // Client-side file size validation (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (uploadFile.size > MAX_FILE_SIZE) {
      setFormError(`File size exceeds 10MB limit. Please use a smaller file.`);
      return;
    }

    try {
      setUploading(true);
      const result = await uploadQuestions(
        uploadFile,
        selectedSectionForUpload.id,
      );
      
      setUploadResult(result);
      
      if (selectedChapter) {
        await loadSections(selectedChapter.id);
      }
    } catch (err) {
      if (err.validationErrors || err.serverErrors) {
 // Structured error handling from enriched error
        setUploadResult({
          created_count: 0,
          skipped_count: 0,
          validation_errors: err.validationErrors,
          errors: err.serverErrors,
          message: err.message
        });
      } else {
        setFormError(err.message);
        showNotification(err.message, "error");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await deleteSubject(id);
      showNotification("Subject deleted successfully!");

      if (selectedSubject?.id === id) {
        setSelectedSubject(null);
        setSelectedChapter(null);
        setChapters([]);
        setSections([]);
      }

      await loadSubjects();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const handleViewQuestions = (sectionId) => {
    router.push(`/question-bank/sections/${sectionId}`);
  };

  const paginatedSubjects = subjects.slice(
    (subjectPage - 1) * itemsPerPage,
    subjectPage * itemsPerPage,
  );
  const totalSubjectPages = Math.ceil(subjects.length / itemsPerPage);

  const paginatedChapters = chapters.slice(
    (chapterPage - 1) * itemsPerPage,
    chapterPage * itemsPerPage,
  );
  const totalChapterPages = Math.ceil(chapters.length / itemsPerPage);

  const paginatedSections = sections.slice(
    (sectionPage - 1) * itemsPerPage,
    sectionPage * itemsPerPage,
  );
  const totalSectionPages = Math.ceil(sections.length / itemsPerPage);

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (loading && !subjects.length) {
    return <QuestionBankLoading />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl mb-6 !p-0 bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg ">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-lg shrink-0">
                    <Database className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-2xl sm:text-3xl">Question Bank</CardTitle>
                    <p className="text-indigo-100 mt-1 text-sm sm:text-base truncate">
                      Manage subjects, chapters, sections, and questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="bg-white/20 text-white hover:bg-white/30 cursor-pointer h-10 w-10 p-0 rounded-full shrink-0"
                    title="Word format guide"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => {
                      setFormError(null);
                      setIsSubjectModalOpen(true);
                    }}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="h-5 w-5 mr-1 sm:mr-2 shrink-0" />
                    New Subject
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {(selectedSubject || selectedChapter) && (
            <Card className="border-0 shadow-md mb-6 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 text-xl font-bold text-gray-800">
                  <BookOpen className="h-6 w-6" />
                  {selectedSubject && (
                    <>
                      <span className="text-indigo-600">
                        {selectedSubject.name}
                      </span>
                      {selectedChapter && (
                        <>
                          <ChevronRight className="h-6 w-6" />
                          <span className="text-purple-600">
                            {selectedChapter.name}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subjects Sidebar */}
            <Card className="border-0 shadow-lg lg:col-span-1 !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-300 to-purple-500 rounded-t-xl">
                <div className="flex items-center gap-2 p-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-lg">
                    Subjects ({subjects.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {subjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="mb-2">No subjects yet</p>
                    <Button
                      onClick={() => {
                        setFormError(null);
                        setIsSubjectModalOpen(true);
                      }}
                      variant="link"
                      className="text-indigo-600"
                    >
                      Create your first subject
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paginatedSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        onClick={() => {
                          setSelectedSubject(subject);
                          setSubjectPage(1); // Reset other lists
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                          selectedSubject?.id === subject.id
                            ? "bg-indigo-100 border-2 border-indigo-500 shadow-md"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">
                              {subject.name}
                            </h3>
                            <span className="text-xs text-indigo-600">
                              {subject.chapter_count || 0} chapters
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-400 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubject(subject);
                                setSubjectData({ name: subject.name });
                                setIsSubjectModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmButton
                              onConfirm={() => handleDeleteSubject(subject.id)}
                              buttonText=""
                              title="Delete Subject"
                              description="Are you sure? All chapters, sections, and questions will be deleted."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pagination
                      currentPage={subjectPage}
                      totalPages={totalSubjectPages}
                      onPageChange={setSubjectPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chapters & Sections */}
            <Card className="border-0 shadow-lg lg:col-span-2 overflow-hidden !p-0">
              {!selectedSubject ? (
                <div className="p-12 text-center text-gray-500">
                  <Database className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">
                    Select a subject to view chapters and sections
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="chapters" className="w-full h-full">
                  <TabsList className="w-full justify-start rounded-none bg-gradient-to-r from-gray-50 to-gray-100 p-0 m-0 h-14 border-b border-gray-200">
                    <TabsTrigger
                      value="chapters"
                      className="
            flex-1 h-full rounded-none m-0
            data-[state=active]:bg-indigo-500 
            data-[state=active]:text-white
            data-[state=active]:shadow-md
            data-[state=inactive]:bg-transparent
            data-[state=inactive]:text-gray-600
            data-[state=inactive]:hover:bg-indigo-50
            transition-all duration-200
            border-b-4 border-transparent
            data-[state=active]:border-indigo-600
            cursor-pointer
          "
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      <span className="font-semibold">
                        Chapters ({chapters.length})
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="sections"
                      disabled={!selectedChapter}
                      className="
            flex-1 h-full rounded-none m-0
            data-[state=active]:bg-purple-500
            data-[state=active]:text-white
            data-[state=active]:shadow-md
            data-[state=inactive]:bg-transparent
            data-[state=inactive]:text-gray-600
            data-[state=inactive]:hover:bg-purple-50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            border-b-4 border-transparent
            data-[state=active]:border-purple-600
            cursor-pointer
          "
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="font-semibold">
                        Sections {selectedChapter ? `(${sections.length})` : ""}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chapters" className="p-6 m-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedSubject.name} - Chapters
                      </h3>
                      <Button
                        onClick={() => {
                          setFormError(null);
                          setIsChapterModalOpen(true);
                        }}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Chapter
                      </Button>
                    </div>

                    {chapters.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="mb-2">No chapters yet</p>
                        <p className="text-sm">
                          Create a chapter to organize your sections
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-center text-base font-bold">
                                Order
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Chapter Name
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Sections
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedChapters.map((chapter) => (
                              <TableRow
                                key={chapter.id}
                                onClick={() => {
                                  setSelectedChapter(chapter);
                                  setSectionPage(1);
                                }}
                                className={`cursor-pointer transition-colors ${
                                  selectedChapter?.id === chapter.id
                                    ? "bg-indigo-50"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <TableCell className="text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 text-lg font-semibold">
                                    {chapter.order}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-base font-medium">
                                  {chapter.name}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    {chapter.section_count || 0} sections
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-400 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChapter(chapter);
                                        setChapterData({
                                          name: chapter.name,
                                          order: chapter.order.toString(),
                                        });
                                        setIsChapterModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <DeleteConfirmButton
                                      onConfirm={() =>
                                        handleDeleteChapter(chapter.id)
                                      }
                                      title="Delete Chapter"
                                      description="Are you sure you want to delete this chapter? All sections and questions in this chapter will be permanently deleted."
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Pagination
                          currentPage={chapterPage}
                          totalPages={totalChapterPages}
                          onPageChange={setChapterPage}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sections" className="p-6 m-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedChapter
                          ? `${selectedChapter.name} - Sections`
                          : "Select a Chapter"}
                      </h3>
                      <Button
                        onClick={() => {
                          setFormError(null);
                          setIsSectionModalOpen(true);
                        }}
                        disabled={!selectedChapter}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>

                    {!selectedChapter ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please select a chapter from the Chapters tab first
                        </AlertDescription>
                      </Alert>
                    ) : sections.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="mb-2">No sections yet</p>
                        <p className="text-sm">
                          Create a section to add questions
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-center text-base font-bold">
                                Order
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Section Name
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Questions
                              </TableHead>
                              <TableHead className="text-center text-base font-bold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSections.map((section) => (
                              <TableRow
                                key={section.id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  window.dispatchEvent(
                                    new Event("navigation-start"),
                                  );
                                  handleViewQuestions(section.id);
                                }}
                              >
                                <TableCell className="text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 text-lg font-semibold">
                                    {section.order}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-base font-medium">
                                  {section.name}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    {section.question_count || 0} questions
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-400 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSection(section);
                                        setSectionData({
                                          name: section.name,
                                          order: section.order.toString(),
                                        });
                                        setIsSectionModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormError(null);
                                        setSelectedSectionForUpload(section);
                                        setIsUploadModalOpen(true);
                                      }}
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      Upload
                                    </Button>
                                    <DeleteConfirmButton
                                      onConfirm={() =>
                                        handleDeleteSection(section.id)
                                      }
                                      title="Delete Section"
                                      description="Are you sure you want to delete this section? All questions in this section will be permanently deleted."
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Pagination
                          currentPage={sectionPage}
                          totalPages={totalSectionPages}
                          onPageChange={setSectionPage}
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Dialog
        open={isSubjectModalOpen}
        onOpenChange={(open) => {
          setIsSubjectModalOpen(open);
          if (!open) {
            setEditingSubject(null);
            setSubjectData({ name: "" });
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "Edit Subject" : "Create New Subject"}
            </DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4 cursor-pointer">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subjectName">Subject Name *</Label>
              <Input
                id="subjectName"
                value={subjectData.name}
                onChange={(e) => setSubjectData({ name: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer hover:bg-gray-400"
              onClick={() => {
                setIsSubjectModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={
                editingSubject ? handleUpdateSubject : handleCreateSubject
              }
              className="bg-indigo-600 cursor-pointer"
            >
              {editingSubject ? "Update Subject" : "Create Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chapter Modal*/}
      <Dialog
        open={isChapterModalOpen}
        onOpenChange={(open) => {
          setIsChapterModalOpen(open);
          if (!open) {
            setEditingChapter(null);
            setChapterData({ name: "", order: "" });
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? "Edit Chapter" : "Create New Chapter"}
            </DialogTitle>
            {selectedSubject && !editingChapter && (
              <p className="text-sm text-gray-500">
                For subject:{" "}
                <span className="font-medium text-indigo-600">
                  {selectedSubject.name}
                </span>
              </p>
            )}
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="chapterName">Chapter Name *</Label>
              <Input
                id="chapterName"
                value={chapterData.name}
                onChange={(e) =>
                  setChapterData({ ...chapterData, name: e.target.value })
                }
                placeholder="e.g., Algebra"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="chapterOrder">Order</Label>
              <Input
                id="chapterOrder"
                type="number"
                min="1"
                value={chapterData.order}
                onChange={(e) =>
                  setChapterData({
                    ...chapterData,
                    order: e.target.value,
                  })
                }
                placeholder="e.g., 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer hover:bg-gray-400"
              onClick={() => {
                setIsChapterModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={
                editingChapter ? handleUpdateChapter : handleCreateChapter
              }
              className="bg-indigo-600 cursor-pointer"
            >
              {editingChapter ? "Update Chapter" : "Create Chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Modal -  Loại bỏ description */}
      <Dialog
        open={isSectionModalOpen}
        onOpenChange={(open) => {
          setIsSectionModalOpen(open);
          if (!open) {
            setEditingSection(null);
            setSectionData({ name: "", order: "" });
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Section" : "Create New Section"}
            </DialogTitle>
            {selectedChapter && !editingSection && (
              <p className="text-sm text-gray-500">
                For chapter:{" "}
                <span className="font-medium text-purple-600">
                  {selectedChapter.name}
                </span>
              </p>
            )}
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sectionName">Section Name *</Label>
              <Input
                id="sectionName"
                value={sectionData.name}
                onChange={(e) =>
                  setSectionData({ ...sectionData, name: e.target.value })
                }
                placeholder="e.g., Linear Equations"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sectionOrder">Order</Label>
              <Input
                id="sectionOrder"
                type="number"
                min="1"
                value={sectionData.order}
                onChange={(e) =>
                  setSectionData({
                    ...sectionData,
                    order: e.target.value,
                  })
                }
                placeholder="e.g., 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer hover:bg-gray-400"
              onClick={() => {
                setIsSectionModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={
                editingSection ? handleUpdateSection : handleCreateSection
              }
              className="bg-purple-600 cursor-pointer"
            >
              {editingSection ? "Update Section" : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
        setIsUploadModalOpen(open);
        if (!open) {
          setFormError(null);
          setUploadFile(null);
          setUploadResult(null);
          setUploading(false);
        }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Upload Questions from Word Document</DialogTitle>
          </DialogHeader>

          {/* Error Alert */}
          {formError && !uploadResult && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Result Display */}
          {uploadResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{uploadResult.created_count || 0}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">{uploadResult.skipped_count || 0}</p>
                  <p className="text-xs text-amber-600">Duplicates</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-700">
                    {(uploadResult.validation_errors?.length || 0) + (uploadResult.errors?.length || 0)}
                  </p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>

              {/* Validation Errors */}
              {uploadResult.validation_errors?.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-red-800">
                    ️ Validation Errors ({uploadResult.validation_errors.length})
                  </h4>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {uploadResult.validation_errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-700 bg-white rounded px-3 py-2 border border-red-100">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Processing Errors */}
              {uploadResult.errors?.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-orange-800">
                    Processing Errors ({uploadResult.errors.length})
                  </h4>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {uploadResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-orange-700 bg-white rounded px-3 py-2 border border-orange-100">
                        {typeof err === 'string' ? err : err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.created_count > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800 text-sm">
                     {uploadResult.message || `${uploadResult.created_count} question(s) created successfully!`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Upload Form (hidden after result) */}
          {!uploadResult && (
            <div className="space-y-4">
              <div>
                <Label>Section</Label>
                <Input
                  value={selectedSectionForUpload?.name || ""}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSectionForUpload?.chapter_name} →{" "}
                  {selectedSectionForUpload?.subject_name}
                </p>
              </div>
              <div>
                <Label htmlFor="uploadFile">Select .docx file *</Label>
                <Input
                  id="uploadFile"
                  type="file"
                  accept=".docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="cursor-pointer mt-1"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500"> Formats: English & Vietnamese auto-detected</p>
                  <p className="text-xs text-gray-500"> Max size: 10MB</p>
                  <p className="text-xs text-gray-500">️ Images in Word are supported (placed after question, before options)</p>
                  <p className="text-xs text-gray-400"> Duplicate questions will be automatically skipped</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer hover:bg-gray-400"
              onClick={() => {
                setIsUploadModalOpen(false);
                setFormError(null);
                setUploadFile(null);
                setUploadResult(null);
              }}
            >
              {uploadResult ? "Close" : "Cancel"}
            </Button>
            {!uploadResult && (
              <Button
                onClick={handleUploadQuestions}
                className="bg-green-600 cursor-pointer"
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Questions
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Word Format Help Modal */}
      <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-6 w-6 text-indigo-600" />
              Word Document Format Guide
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 mb-2">
              <p className="font-medium text-indigo-800 mb-2">
                Upload your questions as a{" "}
                <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-mono">
                  .docx
                </code>{" "}
                file. The system auto-detects English and Vietnamese.
              </p>
              <div className="text-sm text-indigo-700 bg-white/50 rounded-lg p-3 border border-indigo-100/50">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <ImageIcon className="w-4 h-4" /> 
                  Image Support:
                </span>
                You can insert images directly into your Word document. The image must be placed <strong>immediately below the question text and before the answer options</strong>.
              </div>
            </div>

            {/* Multiple Choice */}
            <div className="space-y-2 mb-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                  1
                </span>
                Multiple Choice
              </h3>
              <div className="grid gap-3 md:grid-cols-2 mb-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    English
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Question 1: What is the capital of Vietnam?
A. Hanoi
B. Ho Chi Minh City
C. Da Nang
D. Hai Phong
ANSWER: A`}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Vietnamese
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. Hồ Chí Minh
C. Đà Nẵng
D. Hải Phòng
ĐÁP ÁN: A`}</pre>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                 For multiple correct answers, separate with commas:{" "}
                <code className="rounded bg-amber-100 px-1 font-mono">
                  ANSWER: A, B, D
                </code>
              </div>
            </div>

            {/* True/False Extended */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                  2
                </span>
                True / False Extended
              </h3>
              <div className="grid gap-3 md:grid-cols-2 mb-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                    English
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Question 3: Evaluate the following statements:
1. The sun rises in the East
2. The Earth is square
3. Water boils at 100°C
4. Humans have 4 legs
ANSWER: 1-T, 2-F, 3-T, 4-F`}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Vietnamese
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Câu 3: Đánh giá các phát biểu sau:
1. Mặt trời mọc ở phía Đông
2. Trái đất hình vuông
3. Nước sôi ở 100°C
4. Con người có 4 chân
ĐÁP ÁN: 1-Đ, 2-S, 3-Đ, 4-S`}</pre>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mb-2">
                 Use numbered statements (1. 2. 3.) and T/F or Đ/S in the
                answer line.
              </div>
            </div>

            {/* Ordering */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-700">
                  3
                </span>
                Ordering
              </h3>
              <div className="grid gap-3 md:grid-cols-2 mb-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
                    English
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Question 4: Arrange the seasons in order:
A. Autumn
B. Spring
C. Summer
D. Winter
CORRECT ORDER: B, C, A, D`}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
                    Vietnamese
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Câu 4: Sắp xếp các mùa theo thứ tự:
A. Thu
B. Xuân
C. Hạ
D. Đông
THỨ TỰ ĐÚNG: B, C, A, D`}</pre>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mb-2">
                 Use keywords like &quot;arrange&quot; or &quot;sắp xếp&quot;
                in the question prompt.
              </div>
            </div>

            {/* Fill in the Blank */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">
                  4
                </span>
                Fill in the Blank
              </h3>
              <div className="grid gap-3 md:grid-cols-2 mb-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
                    English
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Question 5: The capital of France is _____?
ANSWER: Paris`}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
                    Vietnamese
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-mono">{`Câu 5: Thủ đô của Pháp là _____?
ĐÁP ÁN: Paris`}</pre>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mb-2">
                 No A/B/C/D options needed. Multiple accepted answers can be
                separated by commas:{" "}
                <code className="rounded bg-amber-100 px-1 font-mono">
                  ANSWER: Paris, paris
                </code>
              </div>
            </div>

            {/* Important Notes */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">
                ️ Important Notes
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li>
                  File must be in <strong>.docx</strong> format (Microsoft Word)
                </li>
                <li>
                  Each question must start with{" "}
                  <code className="rounded bg-slate-200 px-1 font-mono">
                    Question N:
                  </code>{" "}
                  or{" "}
                  <code className="rounded bg-slate-200 px-1 font-mono">
                    Câu N:
                  </code>
                </li>
                <li>
                  Options use capital letters: <strong>A.</strong> B. C. D.
                  (with a dot and space)
                </li>
                <li>
                  Duplicate questions (same prompt + options) will be
                  automatically skipped
                </li>
                <li>
                  The system auto-detects language based on character analysis
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsHelpModalOpen(false)}
              className="bg-indigo-600 cursor-pointer"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </>
  );
}
