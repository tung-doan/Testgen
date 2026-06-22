"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useClassroom } from "@/hooks/useClassroom";
import { TableSkeleton } from "@/components/ui/skeletons";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import Notification from "@/components/common/Notification";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  BookOpen,
  Edit2,
} from "lucide-react";

export default function Class() {
  const router = useRouter();
  const { getAllClassrooms, createClassroom, updateClassroom, deleteClassroom, loading, error } =
    useClassroom();
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Create class dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Edit class dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editClassId, setEditClassId] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await getAllClassrooms();
      setClasses(data);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    }
  };

  const handleDeleteClass = async (classId) => {
    try {
      await deleteClassroom(classId);
      setClasses(classes.filter((c) => c.id !== classId));
      showNotification("Class deleted successfully!");
    } catch (err) {
      showNotification("Failed to delete class: " + err.message, "error");
      throw err;
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!className.trim()) {
      setCreateError("Please fill in class name");
      return;
    }

    try {
      setCreateLoading(true);
      await createClassroom({
        name: className.trim(),
        description: description.trim(),
      });
      setIsCreateDialogOpen(false);
      setClassName("");
      setDescription("");
      showNotification("Class created successfully!");
      await fetchClasses();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditDialog = (classroom) => {
    setEditClassId(classroom.id);
    setEditClassName(classroom.name);
    setEditDescription(classroom.description || "");
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);

    if (!editClassName.trim()) {
      setEditError("Please fill in class name");
      return;
    }

    try {
      setEditLoading(true);
      await updateClassroom(editClassId, {
        name: editClassName.trim(),
        description: editDescription.trim(),
      });
      setIsEditDialogOpen(false);
      showNotification("Class updated successfully!");
      await fetchClasses();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Filter and Pagination
  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClasses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentClasses = filteredClasses.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      <Header />
      <Navbar />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 pt-10">
        <Card className="!p-0 w-full max-w-7xl shadow-2xl border-0 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-xl px-8 py-5 flex flex-row justify-between items-center">
            <div className="p-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Your Classes
              </CardTitle>
              <p className="text-emerald-100 text-sm mt-1">
                Manage your classrooms and students
              </p>
            </div>
            <Button
              onClick={() => {
                setCreateError(null);
                setClassName("");
                setDescription("");
                setIsCreateDialogOpen(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm gap-2 px-5 mr-2 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </CardHeader>

          {/* Search Filter */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search classes by name or description..."
                className="pl-10"
              />
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : error ? (
              <p className="text-center text-red-600 p-12">{error}</p>
            ) : classes.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-gray-400 mb-3">
                  <BookOpen className="mx-auto h-16 w-16 opacity-40" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  No classes found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Create your first class to get started
                </p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="text-gray-400 mb-3">
                  <Search className="mx-auto h-16 w-16 opacity-40" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  No classes match your search
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Class Name
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Description
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">
                          Students
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4">
                          Teacher
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-4 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentClasses.map((classroom, index) => (
                        <TableRow
                          key={classroom.id}
                          className={`hover:bg-emerald-50/60 transition-all duration-150 cursor-pointer border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                          onClick={() => {
                            window.dispatchEvent(
                              new Event("navigation-start")
                            );
                            router.push(`/class/${classroom.id}`);
                          }}
                        >
                          <TableCell className="px-6 py-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-100 rounded-lg p-1.5">
                                <GraduationCap className="h-4 w-4 text-emerald-600" />
                              </div>
                              {classroom.name}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-600 max-w-xs">
                            <p className="truncate">
                              {classroom.description || (
                                <span className="text-gray-400 italic">
                                  No description
                                </span>
                              )}
                            </p>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 text-gray-700">
                              <Users className="h-4 w-4 text-emerald-500" />
                              <span className="font-medium">
                                {classroom.student_count ?? 0}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-600">
                            {classroom.teacher}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => openEditDialog(classroom)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <DeleteConfirmButton
                                onConfirm={() =>
                                  handleDeleteClass(classroom.id)
                                }
                                title="Delete Class"
                                description={`Are you sure you want to delete "${classroom.name}"? This action cannot be undone and will remove all associated students and data.`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      className="gap-1 text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {pageNumbers.map((page) => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={
                            currentPage === page ? "default" : "ghost"
                          }
                          size="sm"
                          className={
                            currentPage === page
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-gray-600 hover:text-gray-900"
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      className="gap-1 text-sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="px-6 py-3 border-t border-gray-100 bg-white">
                  <p className="text-gray-400 text-xs text-center">
                    Page {currentPage} of {totalPages} ·{" "}
                    {filteredClasses.length} class
                    {filteredClasses.length !== 1 ? "es" : ""} total
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div>
                <DialogTitle className="text-2xl font-semibold">
                  Create New Class
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Fill in the details to create a new classroom
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateClass} className="space-y-5 py-4">
            {createError && (
              <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {createError}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="className" className="text-sm font-semibold">
                Class Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full"
                placeholder="e.g., Math 101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description{" "}
                <span className="text-gray-500 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full"
                placeholder="Enter class description"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => setIsCreateDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {createLoading ? "Creating..." : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div>
                <DialogTitle className="text-2xl font-semibold">
                  Edit Class
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Update class details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5 py-4">
            {editError && (
              <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {editError}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="editClassName" className="text-sm font-semibold">
                Class Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editClassName"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                className="w-full"
                placeholder="e.g., Math 101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription" className="text-sm font-semibold">
                Description{" "}
                <span className="text-gray-500 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full"
                placeholder="Enter class description"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => setIsEditDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                {editLoading ? "Updating..." : "Update Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
