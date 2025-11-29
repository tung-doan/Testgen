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
import LoadingScreen from "../loading";
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
} from "lucide-react";

export default function QuestionBank() {
  const router = useRouter();
  const {
    loading,
    error,
    fetchSubjects,
    createSubject,
    deleteSubject,
    fetchChapters,
    createChapter,
    fetchSections,
    createSection,
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
  const [selectedSectionForUpload, setSelectedSectionForUpload] =
    useState(null);

  // Form data - ✅ Đã loại bỏ code
  const [subjectData, setSubjectData] = useState({ name: "" });
  const [chapterData, setChapterData] = useState({ name: "", order: 1 });
  const [sectionData, setSectionData] = useState({ name: "", order: 1 });
  const [uploadFile, setUploadFile] = useState(null);

  const [formError, setFormError] = useState(null);

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

  const loadSubjects = async () => {
    try {
      const data = await fetchSubjects();
      setSubjects(data);
      if (data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0]);
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
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
      console.error("Error loading chapters:", err);
      setChapters([]);
    }
  };

  const loadSections = async (chapterId) => {
    try {
      const data = await fetchSections(chapterId);
      setSections(data);
    } catch (err) {
      console.error("Error loading sections:", err);
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
      setIsSubjectModalOpen(false);
      setSubjectData({ name: "" }); // ✅ Reset
      await loadSubjects();
    } catch (err) {
      setFormError(err.message);
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
      await createChapter({ ...chapterData, subject: selectedSubject.id });
      setIsChapterModalOpen(false);
      setChapterData({ name: "", order: 1 }); // ✅ Reset
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
      await createSection({ ...sectionData, chapter: selectedChapter.id });
      setIsSectionModalOpen(false);
      setSectionData({ name: "", order: 1 }); // ✅ Reset
      await loadSections(selectedChapter.id);
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

    try {
      const result = await uploadQuestions(
        uploadFile,
        selectedSectionForUpload.id
      );
      alert(result.message || "Questions uploaded successfully!");
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setSelectedSectionForUpload(null);

      if (selectedChapter) {
        await loadSections(selectedChapter.id);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteSubject = async (id, event) => {
    event.stopPropagation();
    if (
      !confirm(
        "Are you sure? All chapters, sections, and questions will be deleted."
      )
    )
      return;

    try {
      await deleteSubject(id);

      if (selectedSubject?.id === id) {
        setSelectedSubject(null);
        setSelectedChapter(null);
        setChapters([]);
        setSections([]);
      }

      await loadSubjects();
    } catch (err) {
      alert("Failed to delete subject: " + err.message);
    }
  };

  const handleViewQuestions = (sectionId) => {
    router.push(`/question-bank/sections/${sectionId}`);
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Database className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">Question Bank</CardTitle>
                    <p className="text-indigo-100 mt-1">
                      Manage subjects, chapters, sections, and questions
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setFormError(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Subject
                </Button>
              </div>
            </CardHeader>
          </Card>

          {(selectedSubject || selectedChapter) && (
            <Card className="border-0 shadow-md mb-2 bg-white/80 backdrop-blur">
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

          {loading && !subjects.length ? (
            <LoadingScreen message="Loading question bank..." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subjects Sidebar */}
              <Card className="border-0 shadow-lg lg:col-span-1">
                <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-2">
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
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {subjects.map((subject) => (
                        <div
                          key={subject.id}
                          onClick={() => setSelectedSubject(subject)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) =>
                                handleDeleteSubject(subject.id, e)
                              }
                              className="ml-2 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chapters & Sections */}
              <Card className="border-0 shadow-lg lg:col-span-2 overflow-hidden">
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
          "
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-semibold">
                          Sections{" "}
                          {selectedChapter ? `(${sections.length})` : ""}
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
                          className="bg-indigo-600 hover:bg-indigo-700"
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
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {chapters.map((chapter) => (
                                <TableRow
                                  key={chapter.id}
                                  onClick={() => setSelectedChapter(chapter)}
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
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
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
                              {sections.map((section) => (
                                <TableRow
                                  key={section.id}
                                  className="hover:bg-gray-50"
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
                                        variant="outline"
                                        onClick={() =>
                                          handleViewQuestions(section.id)
                                        }
                                        className="hover:bg-blue-50"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => {
                                          setFormError(null);
                                          setSelectedSectionForUpload(section);
                                          setIsUploadModalOpen(true);
                                        }}
                                      >
                                        <Upload className="h-4 w-4 mr-1" />
                                        Upload
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Subject Modal - ✅ Loại bỏ code field */}
      <Dialog open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div>
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
              onClick={() => {
                setIsSubjectModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} className="bg-indigo-600">
              Create Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chapter Modal - ✅ Loại bỏ description */}
      <Dialog open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
            {selectedSubject && (
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
          <div className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="chapterOrder">Order</Label>
              <Input
                id="chapterOrder"
                type="number"
                min="1"
                value={chapterData.order}
                onChange={(e) =>
                  setChapterData({
                    ...chapterData,
                    order: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChapterModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateChapter} className="bg-indigo-600">
              Create Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Modal - ✅ Loại bỏ description */}
      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Section</DialogTitle>
            {selectedChapter && (
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
          <div className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="sectionOrder">Order</Label>
              <Input
                id="sectionOrder"
                type="number"
                min="1"
                value={sectionData.order}
                onChange={(e) =>
                  setSectionData({
                    ...sectionData,
                    order: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSectionModalOpen(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSection} className="bg-purple-600">
              Create Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Questions from Word Document</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
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
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-2">
                📝 Supported formats: English & Vietnamese
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setFormError(null);
                setUploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadQuestions}
              className="bg-green-600"
              disabled={!uploadFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
